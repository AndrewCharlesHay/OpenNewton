import * as vscode from 'vscode';
import { GitHubActionsMonitor } from './githubActionsMonitor';
import { StatusBarManager } from './statusBarManager';

let monitor: GitHubActionsMonitor | undefined;
let statusBarManager: StatusBarManager | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenNewton is now active');

    // Initialize the status bar manager
    statusBarManager = new StatusBarManager();
    context.subscriptions.push(statusBarManager);

    // Initialize the GitHub Actions monitor
    monitor = new GitHubActionsMonitor(context, statusBarManager);
    context.subscriptions.push({
        dispose: () => monitor?.dispose()
    });

    // Register commands
    const checkStatusCommand = vscode.commands.registerCommand(
        'opennewton.checkStatus',
        async () => {
            await monitor?.checkStatus();
        }
    );

    const showFailuresCommand = vscode.commands.registerCommand(
        'opennewton.showFailures',
        async () => {
            await monitor?.showRecentFailures();
        }
    );

    context.subscriptions.push(checkStatusCommand, showFailuresCommand);

    // Start monitoring
    monitor.start();
}

export function deactivate() {
    monitor?.dispose();
}
