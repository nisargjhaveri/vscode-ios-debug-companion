import * as vscode from 'vscode';
import * as logger from './logger';
import { startUsbmuxdReverseProxy } from './usbmuxdReverseProxy';

enum UsbmuxdProxyAllowed {
    yes,
    no,
    ask
};

let usbmuxdReverseProxyAllowed = UsbmuxdProxyAllowed.ask;

export function activate(context: vscode.ExtensionContext) {
    logger.activate(vscode.window.createOutputChannel("iOS Debug Companion"));
    logger.log('Activating extension "ios-debug-companion"');

    context.subscriptions.push(vscode.commands.registerCommand('ios-debug-companion.activate', (): boolean => {
        return true;
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ios-debug-companion.canStartUsbmuxdReverseProxy', (): boolean => {
        switch (usbmuxdReverseProxyAllowed) {
            case UsbmuxdProxyAllowed.yes: {
                return true;
            }
            case UsbmuxdProxyAllowed.ask: {
                vscode.window.showInformationMessage(
                    'Allow debugging on locally connected iOS devices? This will make the devices accessible from the remote machine.',
                    {value: UsbmuxdProxyAllowed.yes, title: 'Yes'},
                    {value: UsbmuxdProxyAllowed.no, title: 'No'},
                ).then((item) => {
                    usbmuxdReverseProxyAllowed = item?.value ?? UsbmuxdProxyAllowed.no;
                });
                return false;
            }
            case UsbmuxdProxyAllowed.no:
            default: {
                return false;
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ios-debug-companion.startUsbmuxdReverseProxy', async (url: string) => {
        if (usbmuxdReverseProxyAllowed !== UsbmuxdProxyAllowed.yes) {
            return;
        }

        await startUsbmuxdReverseProxy(url);
        vscode.window.showInformationMessage('Remote can now access iOS devices connected locally. Started forwarding connections to usbmuxd.');
    }));
}

export function deactivate() {}
