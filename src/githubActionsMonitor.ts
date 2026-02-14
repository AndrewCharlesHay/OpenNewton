import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { StatusBarManager } from './statusBarManager';

interface WorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    html_url: string;
    created_at: string;
    head_branch: string;
    head_commit: {
        message: string;
    };
}

interface FailedJob {
    name: string;
    conclusion: string;
    html_url: string;
    steps: Array<{
        name: string;
        conclusion: string;
        number: number;
    }>;
}

export class GitHubActionsMonitor {
    private octokit: Octokit | undefined;
    private timer: NodeJS.Timeout | undefined;
    private context: vscode.ExtensionContext;
    private statusBarManager: StatusBarManager;
    private lastCheckedRunId: number = 0;
    private recentFailures: Array<{ run: WorkflowRun; jobs: FailedJob[] }> = [];

    constructor(context: vscode.ExtensionContext, statusBarManager: StatusBarManager) {
        this.context = context;
        this.statusBarManager = statusBarManager;
        this.initializeOctokit();
    }

    private initializeOctokit() {
        const config = vscode.workspace.getConfiguration('githubActionsMonitor');
        const token = config.get<string>('token');

        if (token) {
            this.octokit = new Octokit({ auth: token });
        }
    }

    private getRepositoryInfo(): { owner: string; repo: string } | null {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }

        // Try to get repository info from git remote
        // This is a simplified version - in production you'd want to use a git library
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            return null;
        }

        const git = gitExtension.exports.getAPI(1);
        if (git.repositories.length === 0) {
            return null;
        }

        const repository = git.repositories[0];
        const remotes = repository.state.remotes;

        for (const remote of remotes) {
            const url = remote.fetchUrl || remote.pushUrl;
            if (url) {
                const match = url.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);
                if (match) {
                    return { owner: match[1], repo: match[2] };
                }
            }
        }

        return null;
    }

    public async checkStatus() {
        const config = vscode.workspace.getConfiguration('githubActionsMonitor');
        const enabled = config.get<boolean>('enabled', true);

        if (!enabled) {
            vscode.window.showInformationMessage('GitHub Actions monitoring is disabled');
            return;
        }

        if (!this.octokit) {
            this.initializeOctokit();
            if (!this.octokit) {
                vscode.window.showWarningMessage(
                    'GitHub token not configured. Run "GitHub Actions: Configure" command.'
                );
                return;
            }
        }

        const repoInfo = this.getRepositoryInfo();
        if (!repoInfo) {
            vscode.window.showWarningMessage('No GitHub repository detected in workspace');
            return;
        }

        try {
            this.statusBarManager.updateStatus('loading', 'Checking GitHub Actions...');

            const { data: runs } = await this.octokit.actions.listWorkflowRunsForRepo({
                owner: repoInfo.owner,
                repo: repoInfo.repo,
                per_page: 10,
            });

            if (runs.workflow_runs.length === 0) {
                this.statusBarManager.updateStatus('success', 'No workflow runs found');
                return;
            }

            const latestRun = runs.workflow_runs[0];
            const failedRuns = runs.workflow_runs.filter(
                run => run.conclusion === 'failure' || run.conclusion === 'cancelled'
            );

            // Check for new failures since last check
            const newFailures = failedRuns.filter(run => run.id > this.lastCheckedRunId);

            if (newFailures.length > 0 && config.get<boolean>('notifyOnFailure', true)) {
                for (const failedRun of newFailures) {
                    await this.notifyFailure(repoInfo, failedRun as WorkflowRun);
                }
            }

            // Update last checked run ID
            if (runs.workflow_runs.length > 0) {
                this.lastCheckedRunId = Math.max(
                    this.lastCheckedRunId,
                    ...runs.workflow_runs.map(r => r.id)
                );
            }

            // Update status bar
            if (latestRun.conclusion === 'success') {
                this.statusBarManager.updateStatus('success', 'All checks passing');
            } else if (latestRun.conclusion === 'failure' || latestRun.conclusion === 'cancelled') {
                this.statusBarManager.updateStatus('error', `Build failing: ${latestRun.name}`);
            } else if (latestRun.status === 'in_progress' || latestRun.status === 'queued') {
                this.statusBarManager.updateStatus('loading', 'Build in progress...');
            } else {
                this.statusBarManager.updateStatus('idle', 'Unknown status');
            }
        } catch (error) {
            console.error('Error checking GitHub Actions:', error);
            this.statusBarManager.updateStatus('error', 'Error checking status');
            
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`GitHub Actions error: ${error.message}`);
            }
        }
    }

    private async notifyFailure(
        repoInfo: { owner: string; repo: string },
        run: WorkflowRun
    ) {
        if (!this.octokit) {
            return;
        }

        try {
            // Fetch failed jobs
            const { data: jobs } = await this.octokit.actions.listJobsForWorkflowRun({
                owner: repoInfo.owner,
                repo: repoInfo.repo,
                run_id: run.id,
            });

            const failedJobs = jobs.jobs.filter(
                job => job.conclusion === 'failure' || job.conclusion === 'cancelled'
            );

            // Store failure info
            this.recentFailures.unshift({
                run,
                jobs: failedJobs as FailedJob[],
            });

            // Keep only last 10 failures
            if (this.recentFailures.length > 10) {
                this.recentFailures = this.recentFailures.slice(0, 10);
            }

            // Create detailed failure message
            const failureDetails = failedJobs
                .map(job => {
                    const failedSteps = job.steps
                        ?.filter(step => step.conclusion === 'failure')
                        .map(step => `  - ${step.name}`)
                        .join('\n') || '';
                    
                    return `Job: ${job.name}\n${failedSteps}`;
                })
                .join('\n\n');

            const message = `GitHub Actions Failed: ${run.name}\n\nBranch: ${run.head_branch}\nCommit: ${run.head_commit.message}\n\n${failureDetails}`;

            // Show notification with actions
            const action = await vscode.window.showErrorMessage(
                `GitHub Actions workflow "${run.name}" failed`,
                'View Details',
                'Open in Browser'
            );

            if (action === 'View Details') {
                this.showFailureDetails(run, failedJobs as FailedJob[]);
            } else if (action === 'Open in Browser') {
                vscode.env.openExternal(vscode.Uri.parse(run.html_url));
            }

            // Log to output channel for coding agents
            this.logForCodingAgent(message);
        } catch (error) {
            console.error('Error fetching job details:', error);
        }
    }

    private showFailureDetails(run: WorkflowRun, jobs: FailedJob[]) {
        const panel = vscode.window.createWebviewPanel(
            'githubActionsFailure',
            `Failed: ${run.name}`,
            vscode.ViewColumn.One,
            {}
        );

        const jobsHtml = jobs
            .map(job => {
                const stepsHtml = job.steps
                    ?.filter(step => step.conclusion === 'failure')
                    .map(
                        step =>
                            `<li><strong>Step ${step.number}:</strong> ${step.name} - ${step.conclusion}</li>`
                    )
                    .join('') || '';

                return `
                    <div class="job">
                        <h3>${job.name}</h3>
                        <p>Status: ${job.conclusion}</p>
                        <ul>${stepsHtml}</ul>
                        <a href="${job.html_url}">View Job</a>
                    </div>
                `;
            })
            .join('');

        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Workflow Failure Details</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 20px; }
                    h1 { color: var(--vscode-errorForeground); }
                    .job { 
                        margin: 20px 0; 
                        padding: 15px; 
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 5px;
                    }
                    .job h3 { margin-top: 0; }
                    a { color: var(--vscode-textLink-foreground); }
                    ul { margin: 10px 0; }
                    .metadata { 
                        background: var(--vscode-editor-background); 
                        padding: 10px; 
                        border-radius: 3px;
                        margin: 10px 0;
                    }
                </style>
            </head>
            <body>
                <h1>Workflow Failed: ${run.name}</h1>
                <div class="metadata">
                    <p><strong>Branch:</strong> ${run.head_branch}</p>
                    <p><strong>Commit:</strong> ${run.head_commit.message}</p>
                    <p><strong>Time:</strong> ${new Date(run.created_at).toLocaleString()}</p>
                    <p><a href="${run.html_url}">View on GitHub</a></p>
                </div>
                <h2>Failed Jobs</h2>
                ${jobsHtml}
            </body>
            </html>
        `;
    }

    private logForCodingAgent(message: string) {
        const outputChannel = vscode.window.createOutputChannel('GitHub Actions Failures');
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine(`[${new Date().toISOString()}] GITHUB ACTIONS FAILURE DETECTED`);
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine(message);
        outputChannel.appendLine('='.repeat(80));
        outputChannel.show(true);
    }

    public async showRecentFailures() {
        if (this.recentFailures.length === 0) {
            vscode.window.showInformationMessage('No recent failures found');
            return;
        }

        const items = this.recentFailures.map(failure => ({
            label: `$(error) ${failure.run.name}`,
            description: `${failure.run.head_branch} - ${new Date(failure.run.created_at).toLocaleString()}`,
            detail: failure.run.head_commit.message,
            failure,
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a failed workflow to view details',
        });

        if (selected) {
            this.showFailureDetails(selected.failure.run, selected.failure.jobs);
        }
    }

    public start() {
        const config = vscode.workspace.getConfiguration('githubActionsMonitor');
        const enabled = config.get<boolean>('enabled', true);
        const pollInterval = config.get<number>('pollInterval', 300) * 1000;

        if (!enabled) {
            return;
        }

        // Initial check
        this.checkStatus();

        // Set up polling
        this.timer = setInterval(() => {
            this.checkStatus();
        }, pollInterval);
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
}
