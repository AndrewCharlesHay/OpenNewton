import * as vscode from 'vscode';
import { Octokit } from '@octokit/rest';
import { StatusBarManager } from './statusBarManager';
import { LogAnalysis } from './logAnalysis';

/* eslint-disable @typescript-eslint/naming-convention */
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
/* eslint-enable @typescript-eslint/naming-convention */

export class GitHubActionsMonitor {
    private octokit: Octokit | undefined;
    private timer: NodeJS.Timeout | undefined;
    private context: vscode.ExtensionContext;
    private statusBarManager: StatusBarManager;
    private lastCheckedRunId: number = 0;
    private recentFailures: Array<{ run: WorkflowRun; jobs: FailedJob[] }> = [];
    private outputChannel: vscode.OutputChannel;
    private logAnalysis: LogAnalysis | undefined;

    constructor(context: vscode.ExtensionContext, statusBarManager: StatusBarManager) {
        this.context = context;
        this.statusBarManager = statusBarManager;
        this.outputChannel = vscode.window.createOutputChannel('GitHub Actions Failures');
        // Octokit initialized in start() via Auth
    }

    private async initializeOctokit(): Promise<boolean> {
        try {
            const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
            if (session) {
                this.octokit = new Octokit({ auth: session.accessToken });
                this.logAnalysis = new LogAnalysis(this.octokit);
                return true;
            }
        } catch (e) {
            vscode.window.showErrorMessage(`Failed to authenticate with GitHub: ${e}`);
        }
        return false;
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
        if (!this.octokit) {
            const success = await this.initializeOctokit();
            if (!success) { return; }
        }

        const repoInfo = this.getRepositoryInfo();
        if (!repoInfo) {
            this.statusBarManager.updateStatus('idle', 'No GitHub Repo');
            return;
        }

        try {
            this.statusBarManager.updateStatus('loading', 'Checking GitHub Actions...');

            const { data: runs } = await this.octokit!.actions.listWorkflowRunsForRepo({
                owner: repoInfo.owner,
                repo: repoInfo.repo,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                per_page: 5,
            });

            if (!runs.workflow_runs || runs.workflow_runs.length === 0) {
                this.statusBarManager.updateStatus('success', 'No runs');
                return;
            }

            const latestRun = runs.workflow_runs[0];
            
            // Check for new failures
            const newFailures = runs.workflow_runs.filter(
                run => (run.conclusion === 'failure' || run.conclusion === 'cancelled') && run.id > this.lastCheckedRunId
            );

            if (newFailures.length > 0) {
                for (const failedRun of newFailures) {
                    await this.notifyFailure(repoInfo, failedRun as WorkflowRun);
                }
            }

            // Update ID
             this.lastCheckedRunId = Math.max(
                this.lastCheckedRunId, 
                ...runs.workflow_runs.map(r => r.id)
            );

            // Update Status Bar
            if (latestRun.conclusion === 'success') {
                this.statusBarManager.updateStatus('success', 'Passing');
            } else if (latestRun.conclusion === 'failure') {
                this.statusBarManager.updateStatus('error', 'Failing');
            } else {
                this.statusBarManager.updateStatus('loading', 'Running...');
            }

        } catch (error) {
            console.error(error);
            this.statusBarManager.updateStatus('error', 'Error');
        }
    }

    private async notifyFailure(
        repoInfo: { owner: string; repo: string },
        run: WorkflowRun
    ) {
        // 1. Get Failure Context (Logs)
        let context = "Unable to fetch logs.";
        if (this.logAnalysis) {
             context = await this.logAnalysis.getFailureContext(repoInfo.owner, repoInfo.repo, run.id);
        }

        // 2. Prompt the Agent
        const prompt = `Workflow "${run.name}" failed on branch "${run.head_branch}".\n\nError Context:\n${context}\n\nPlease analyze this failure and propose a fix.`;

        // 3. Trigger Chat
        vscode.commands.executeCommand('workbench.action.chat.open', { query: prompt });
        
        // 4. Show notification (optional, maybe less intrusive now?)
        vscode.window.showErrorMessage(`Workflow ${run.name} failed. Opening Chat...`, 'Open Logs').then(selection => {
            if (selection === 'Open Logs') {
                vscode.env.openExternal(vscode.Uri.parse(run.html_url));
            }
        });

        // 5. Store failure info for history
        this.recentFailures.unshift({
            run,
            jobs: [] // We don't fetch detailed jobs list here anymore, logAnalysis handles logging
        });
        if (this.recentFailures.length > 10) { this.recentFailures = this.recentFailures.slice(0, 10); }
    }

    private showFailureDetails(run: WorkflowRun, jobs: FailedJob[]) {
         // Existing implementation would go here, simplified for this rewrite to focus on agentic flow
         // If we want to keep the webview, we need to fetch jobs again or Refactor notifyFailure to fetch them.
         // For now, let's just open the URL.
         vscode.env.openExternal(vscode.Uri.parse(run.html_url));
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
        
        if (!enabled) { return; }

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

    public dispose() {
        this.stop();
        this.outputChannel.dispose();
    }
}
