import * as vscode from 'vscode';
import * as logger from './logger';
import { ensureUsbmuxdConnects, startUsbmuxdReverseProxy, usbmuxdConnectionFailureMessage } from './usbmuxdReverseProxy';

type UsbmuxdReverseProxyAllowed = "unknown" | "yes" | "no";
type ConfigShareLocalDevices = "ask" | "always" | "never";

let usbmuxdReverseProxyAllowed: UsbmuxdReverseProxyAllowed = "unknown";


function ensureUserPermission(): boolean {
    const iosDebugConfig = vscode.workspace.getConfiguration("ios-debug");
    const configShareLocalDevices = iosDebugConfig.get<ConfigShareLocalDevices>('shareLocalDevices');

    if (typeof configShareLocalDevices === "undefined") {
        // ios-debug extension not installed? Or does not yet support sharing devices?
        // We should not reach here.
        return false;
    }

    if (configShareLocalDevices === "always") {
        usbmuxdReverseProxyAllowed = "yes";
        return true;
    } else if (configShareLocalDevices === "never") {
        usbmuxdReverseProxyAllowed = "no";
        return false;
    } else if (configShareLocalDevices === "ask") {
        vscode.window.showInformationMessage(
            'Allow debugging on locally connected iOS devices? This will make the devices accessible from the remote machine.',
            {value: "yes", title: 'Yes'},
            {value: "always", title: 'Always'},
            {value: "never", title: 'Never'},
        ).then(async (item) => {
            if (typeof item === "undefined") {
                usbmuxdReverseProxyAllowed = "no";
            } else if (item.value === "yes") {
                usbmuxdReverseProxyAllowed = "yes";
            } else if (item.value === "always") {
                usbmuxdReverseProxyAllowed = "yes";
                await iosDebugConfig.update("shareLocalDevices", "always", true);
            } else if (item.value === "never") {
                usbmuxdReverseProxyAllowed = "no";
                await iosDebugConfig.update("shareLocalDevices", "never", true);
            }
        });

        return false;
    }

    return false;
}

export function activate(context: vscode.ExtensionContext) {
    logger.activate(vscode.window.createOutputChannel("iOS Debug Companion"));
    logger.log('Activating extension "ios-debug-companion"');

    context.subscriptions.push(vscode.commands.registerCommand('ios-debug-companion.activate', (): boolean => {
        return true;
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ios-debug-companion.canStartUsbmuxdReverseProxy', (): boolean => {
        switch (usbmuxdReverseProxyAllowed) {
            case "yes": {
                return true;
            }
            case "unknown": {
                // Ask for permission, don't wait for the response
                return ensureUserPermission();
            }
            case "no":
            default: {
                return false;
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('ios-debug-companion.startUsbmuxdReverseProxy', async (url: string) => {
        if (usbmuxdReverseProxyAllowed !== "yes") {
            return;
        }

        ensureUsbmuxdConnects().catch((e) => {
            logger.error("Error ensuring usbmuxd connection:", e);
            vscode.window.showWarningMessage(usbmuxdConnectionFailureMessage(), "Dismiss");
        });

        await startUsbmuxdReverseProxy(url);
        vscode.window.showInformationMessage('Remote can now access iOS devices connected locally. Started forwarding connections to usbmuxd.');
    }));
}

export function deactivate() {}
