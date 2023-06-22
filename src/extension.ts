import * as vscode from 'vscode';
import * as logger from './logger';
import { startUsbmuxdReverseProxy } from './usbmuxdReverseProxy';

export function activate(context: vscode.ExtensionContext) {
    logger.activate(vscode.window.createOutputChannel("iOS Debug Companion"));
    logger.log('Activating extension "ios-debug-companion"');

    context.subscriptions.push(vscode.commands.registerCommand('ios-debug-companion.activate', () => {
        return true;
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ios-debug-companion.startUsbmuxdReverseProxy', (url: string) => {
        vscode.window.showInformationMessage('Starting reverse proxy for usbmuxd');

        startUsbmuxdReverseProxy(url);
    }));
}

export function deactivate() {}
