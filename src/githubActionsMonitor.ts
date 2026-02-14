import * as vscode from "vscode";
import { Octokit } from "@octokit/rest";
import { StatusBarManager } from "./statusBarManager";
import { LogAnalysis } from "./logAnalysis";

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

  constructor(
    context: vscode.ExtensionContext,
    statusBarManager: StatusBarManager,
  ) {
    this.context = context;
    this.statusBarManager = statusBarManager;
    this.outputChannel = vscode.window.createOutputChannel(
      "OpenNewton",
    );
    // Octokit initialized in start() via Auth
  }

  private async initializeOctokit(): Promise<boolean> {
    try {
      const session = await vscode.authentication.getSession(
        "github",
        ["repo"],
        { createIfNone: true },
      );
      if (session) {
        this.octokit = new Octokit({ auth: session.accessToken });
        this.logAnalysis = new LogAnalysis(this.octokit);
        return true;
      }
    } catch (e) {
      vscode.window.showErrorMessage(
        `Failed to authenticate with GitHub: ${e}`,
      );
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
    const gitExtension = vscode.extensions.getExtension("vscode.git");
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
    // eslint-disable-next-line no-console
    console.log('OpenNewton: checkStatus called');
    
    if (!this.octokit) {
      // eslint-disable-next-line no-console
      console.log('OpenNewton: initializing Octokit');
      const success = await this.initializeOctokit();
      if (!success) {
        // eslint-disable-next-line no-console
        console.log('OpenNewton: Octokit initialization failed');
        return;
      }
    }

    const repoInfo = this.getRepositoryInfo();
    if (!repoInfo) {
      // eslint-disable-next-line no-console
      console.log('OpenNewton: No repository info found');
      this.statusBarManager.updateStatus("idle", "No GitHub Repo");
      return;
    }
    // eslint-disable-next-line no-console
    console.log(`OpenNewton: Checking repo ${repoInfo.owner}/${repoInfo.repo}`);

    try {
      this.statusBarManager.updateStatus(
        "loading",
        "Checking OpenNewton status...",
      );

      const { data: runs } =
        await this.octokit!.actions.listWorkflowRunsForRepo({
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          per_page: 5,
        });

      // eslint-disable-next-line no-console
      console.log(`OpenNewton: Found ${runs.total_count} runs`);

      if (!runs.workflow_runs || runs.workflow_runs.length === 0) {
        this.statusBarManager.updateStatus("success", "No runs");
        return;
      }

      const latestRun = runs.workflow_runs[0];
      // eslint-disable-next-line no-console
      console.log(`OpenNewton: Latest run ${latestRun.id} status: ${latestRun.conclusion}`);

      // Check for new failures
      const newFailures = runs.workflow_runs.filter(
        (run) =>
          (run.conclusion === "failure" || run.conclusion === "cancelled") &&
          run.id > this.lastCheckedRunId,
      );

      // eslint-disable-next-line no-console
      console.log(`OpenNewton: New failures detected: ${newFailures.length} (Last checked ID: ${this.lastCheckedRunId})`);

      if (newFailures.length > 0) {
        for (const failedRun of newFailures) {
          await this.notifyFailure(repoInfo, failedRun as WorkflowRun);
        }
      }

      // Update ID
      this.lastCheckedRunId = Math.max(
        this.lastCheckedRunId,
        ...runs.workflow_runs.map((r) => r.id),
      );

      // Update Status Bar
      if (latestRun.conclusion === "success") {
        this.statusBarManager.updateStatus("success", "Passing");
      } else if (latestRun.conclusion === "failure") {
        this.statusBarManager.updateStatus("error", "Failing");
      } else {
        this.statusBarManager.updateStatus("loading", "Running...");
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('OpenNewton Error:', error);
      this.statusBarManager.updateStatus("error", "Error");
    }
  }

  private async notifyFailure(
    repoInfo: { owner: string; repo: string },
    run: WorkflowRun,
  ) {
    // 1. Get Failure Context (Logs)
    let context = "Unable to fetch logs.";
    if (this.logAnalysis) {
      context = await this.logAnalysis.getFailureContext(
        repoInfo.owner,
        repoInfo.repo,
        run.id,
      );
    }

    // 2. Get Configuration
    const config = vscode.workspace.getConfiguration("openNewton");
    const chatCommand = config.get<string>("chatCommand", "workbench.action.chat.open");
    const logFormat = config.get<string>("logFormat", "text");

    // 3. Log Failure
    if (logFormat === "json") {
        const logEntry = {
            event: "workflow_failure",
            source: "OpenNewton CI Monitor",
            repository: `${repoInfo.owner}/${repoInfo.repo}`,
            workflow: run.name,
            runId: run.id,
            branch: run.head_branch,
            commit: run.head_commit.message,
            status: run.conclusion,
            url: run.html_url,
            context: context,
            instructions: "Analyze this CI failure and fix the errors in the codebase. Check .github/workflows/ for workflow configuration if needed."
        };
        this.outputChannel.appendLine(JSON.stringify(logEntry));
    } else {
        this.outputChannel.appendLine("=".repeat(60));
        this.outputChannel.appendLine("[OpenNewton CI Monitor] Workflow Failure Detected");
        this.outputChannel.appendLine("=".repeat(60));
        this.outputChannel.appendLine(`Repository: ${repoInfo.owner}/${repoInfo.repo}`);
        this.outputChannel.appendLine(`Workflow: ${run.name}`);
        this.outputChannel.appendLine(`Branch: ${run.head_branch}`);
        this.outputChannel.appendLine(`Commit: ${run.head_commit.message}`);
        this.outputChannel.appendLine(`Run URL: ${run.html_url}`);
        this.outputChannel.appendLine("-".repeat(60));
        this.outputChannel.appendLine("Error Context:");
        this.outputChannel.appendLine(context);
        this.outputChannel.appendLine("-".repeat(60));
        this.outputChannel.appendLine("Instructions: Analyze this CI failure and fix the errors in the codebase.");
        this.outputChannel.appendLine("Check .github/workflows/ for workflow configuration if needed.");
        this.outputChannel.appendLine("=".repeat(60));
    }

    // 4. Trigger Chat (or configured command)
    const prompt = `[OpenNewton CI Monitor]

A GitHub Actions workflow has failed in your repository. This message was automatically generated by the OpenNewton VS Code extension, which monitors your CI/CD pipelines and alerts you to failures.

**Failure Summary:**
- Workflow: "${run.name}"
- Branch: "${run.head_branch}"
- Repository: ${repoInfo.owner}/${repoInfo.repo}
- Commit: ${run.head_commit.message}
- Run URL: ${run.html_url}

**Error Context:**
${context}

**Your Task:**
Please analyze this failure and propose a fix. Check the relevant source files in the workspace and the workflow configuration in \`.github/workflows/\` if needed. Make the necessary code changes to resolve this CI failure.

**Important:** After fixing the issue, commit and push your changes immediately so the CI can re-run and verify the fix.`;
    
    try {
      if (chatCommand && chatCommand.trim().length > 0) {
          // If the command is the default chat command, pass the query arg.
          // Other commands might not support args, or might support different args.
          // For now, we assume if it's "chat.open" style, it takes 'query'.
          // If the user configures a custom command, we might need to just run it without args 
          // or finding a way to pass data. Capturing the output channel is safer for agents.
          await vscode.commands.executeCommand(chatCommand, {
            query: prompt,
          });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to execute command ${chatCommand}:`, error);
      // Fallback: ensure it's logged (already done above)
      if (logFormat !== "json") {
          this.outputChannel.appendLine(`Note: Failed to execute command ${chatCommand}`);
      }
    }

    // 4. Show notification (optional, maybe less intrusive now?)
    vscode.window.showErrorMessage(`Workflow ${run.name} failed. Click to view on GitHub.`, 'View Details').then(selection => {
        if (selection === 'View Details') {
            vscode.env.openExternal(vscode.Uri.parse(run.html_url));
        }
    });

    // 5. Store failure info for history
    this.recentFailures.unshift({
      run,
      jobs: [], // We don't fetch detailed jobs list here anymore, logAnalysis handles logging
    });
    if (this.recentFailures.length > 10) {
      this.recentFailures = this.recentFailures.slice(0, 10);
    }
  }

  private showFailureDetails(run: WorkflowRun, jobs: FailedJob[]) {
    // Existing implementation would go here, simplified for this rewrite to focus on agentic flow
    // If we want to keep the webview, we need to fetch jobs again or Refactor notifyFailure to fetch them.
    // For now, let's just open the URL.
    vscode.env.openExternal(vscode.Uri.parse(run.html_url));
  }

  public async showRecentFailures() {
    if (this.recentFailures.length === 0) {
      vscode.window.showInformationMessage("No recent failures found");
      return;
    }

    const items = this.recentFailures.map((failure) => ({
      label: `$(error) ${failure.run.name}`,
      description: `${failure.run.head_branch} - ${new Date(failure.run.created_at).toLocaleString()}`,
      detail: failure.run.head_commit.message,
      failure,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a failed workflow to view details",
    });

    if (selected) {
      this.showFailureDetails(selected.failure.run, selected.failure.jobs);
    }
  }

  public start() {
    const config = vscode.workspace.getConfiguration('openNewton');
    const enabled = config.get<boolean>("enabled", true);
    const pollInterval = config.get<number>("pollInterval", 300) * 1000;

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

  public dispose() {
    this.stop();
    this.outputChannel.dispose();
  }
}
