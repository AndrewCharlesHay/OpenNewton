import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { StatusBarManager } from '../../statusBarManager';

suite('StatusBarManager Test Suite', () => {
    let statusBarManager: StatusBarManager;
    let statusBarItem: sinon.SinonStubbedInstance<vscode.StatusBarItem>;

    setup(() => {
        // Create a stubbed status bar item
        statusBarItem = {
            text: '',
            tooltip: '',
            command: '',
            backgroundColor: undefined,
            show: sinon.stub(),
            hide: sinon.stub(),
            dispose: sinon.stub()
        } as any;

        // Stub vscode.window.createStatusBarItem
        sinon.stub(vscode.window, 'createStatusBarItem').returns(statusBarItem as any);

        statusBarManager = new StatusBarManager();
    });

    teardown(() => {
        sinon.restore();
    });

    test('Should create status bar item on construction', () => {
        assert.ok(vscode.window.createStatusBarItem as sinon.SinonStub);
        assert.ok((vscode.window.createStatusBarItem as sinon.SinonStub).calledOnce);
    });

    test('Should show status bar item on construction', () => {
        assert.ok(statusBarItem.show.calledOnce);
    });

    test('Should update status to idle', () => {
        statusBarManager.updateStatus('idle', 'Test Message');
        assert.strictEqual(statusBarItem.text, '$(github) Test Message');
        assert.strictEqual(statusBarItem.backgroundColor, undefined);
    });

    test('Should update status to loading', () => {
        statusBarManager.updateStatus('loading', 'Checking...');
        assert.strictEqual(statusBarItem.text, '$(sync~spin) Checking...');
        assert.strictEqual(statusBarItem.backgroundColor, undefined);
    });

    test('Should update status to success', () => {
        statusBarManager.updateStatus('success', 'All passing');
        assert.strictEqual(statusBarItem.text, '$(check) All passing');
        assert.strictEqual(statusBarItem.backgroundColor, undefined);
    });

    test('Should update status to error with background color', () => {
        statusBarManager.updateStatus('error', 'Build failed');
        assert.strictEqual(statusBarItem.text, '$(error) Build failed');
        assert.ok(statusBarItem.backgroundColor instanceof vscode.ThemeColor);
    });

    test('Should set command on status bar item', () => {
        assert.strictEqual(statusBarItem.command, 'github-actions-monitor.checkStatus');
    });

    test('Should dispose status bar item', () => {
        statusBarManager.dispose();
        assert.ok(statusBarItem.dispose.calledOnce);
    });

    test('Should handle multiple status updates', () => {
        statusBarManager.updateStatus('loading', 'Checking...');
        statusBarManager.updateStatus('success', 'Success');
        statusBarManager.updateStatus('error', 'Error');
        
        assert.strictEqual(statusBarItem.text, '$(error) Error');
    });
});
