import * as vscode from 'vscode';
import { GitHubActionsMonitor } from './githubActionsMonitor';
import { StatusBarManager } from './statusBarManager';

let monitor: GitHubActionsMonitor | undefined;
let statusBarManager: StatusBarManager | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('GitHub Actions Monitor is now active');

    // Initialize the status bar manager
    statusBarManager = new StatusBarManager();
    context.subscriptions.push(statusBarManager);

    // Initialize the GitHub Actions monitor
    monitor = new GitHubActionsMonitor(context, statusBarManager);

    // Register commands
    const checkStatusCommand = vscode.commands.registerCommand(
        'github-actions-monitor.checkStatus',
        async () => {
            await monitor?.checkStatus();
        }
    );

    const configureCommand = vscode.commands.registerCommand(
        'github-actions-monitor.configure',
        async () => {
            const token = await vscode.window.showInputBox({
                prompt: 'Enter your GitHub Personal Access Token',
                password: true,
                placeHolder: 'ghp_xxxxxxxxxxxx'
            });

            if (token) {
                await vscode.workspace.getConfiguration('githubActionsMonitor').update(
                    'token',
                    token,
                    vscode.ConfigurationTarget.Global
                );
                vscode.window.showInformationMessage('GitHub token saved successfully');
            }
        }
    );

    const showFailuresCommand = vscode.commands.registerCommand(
        'github-actions-monitor.showFailures',
        async () => {
            await monitor?.showRecentFailures();
        }
    );

    context.subscriptions.push(checkStatusCommand, configureCommand, showFailuresCommand);

    // Start monitoring
    monitor.start();
}

export function deactivate() {
    monitor?.stop();
}
