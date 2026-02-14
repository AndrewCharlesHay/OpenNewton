import * as vscode from 'vscode';

type StatusType = 'idle' | 'loading' | 'success' | 'error';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'github-actions-monitor.checkStatus';
        this.statusBarItem.show();
        this.updateStatus('idle', 'GitHub Actions');
    }

    public updateStatus(type: StatusType, text: string) {
        switch (type) {
            case 'loading':
                this.statusBarItem.text = `$(sync~spin) ${text}`;
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'success':
                this.statusBarItem.text = `$(check) ${text}`;
                this.statusBarItem.backgroundColor = undefined;
                break;
            case 'error':
                this.statusBarItem.text = `$(error) ${text}`;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor(
                    'statusBarItem.errorBackground'
                );
                break;
            case 'idle':
            default:
                this.statusBarItem.text = `$(github) ${text}`;
                this.statusBarItem.backgroundColor = undefined;
                break;
        }
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
