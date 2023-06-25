import * as net from 'net';
import { WebSocket, createWebSocketStream } from 'ws';
// @ts-ignore
import { BPMux } from "bpmux";
import { Duplex } from 'stream';
import * as logger from './logger';

function createUsbmuxdConnection(connectionListener: () => void) {
    if (process.platform === "darwin" || process.platform === "linux") {
        return net.createConnection("/var/run/usbmuxd", connectionListener);
    }
    else if (process.platform === "win32") {
        return net.createConnection(27015, "127.0.0.1", connectionListener);
    }

    throw new Error("No known usbmuxd socket for the platform");
}

export function usbmuxdConnectionFailureMessage() {
    if (process.platform === "linux") {
        return "Locally connected iOS devices may not be available for debugging. Make sure you have [usbmuxd](https://github.com/libimobiledevice/usbmuxd) installed and running on the local machine.";
    }
    else if (process.platform === "win32") {
        return 'Locally connected iOS devices may not be available for debugging. Make sure you have "iTunes" installed and "Apple Mobile Device Service (AMDS)" is running on the local machine.';
    }
    else {
        return "Locally connected iOS devices may not be available for debugging. Could not connect to usbmuxd socket on the local machine.";
    }
}

export async function ensureUsbmuxdConnects(timeout: number = 3000): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let completed = false;

        let complete = (callback: () => void) => {
            if (!completed) {
                completed = true;
                clearTimeout(timer);
                callback();
            }
        };

        const timer = setTimeout(() => {
            complete(() => reject(new Error(`Usbmuxd connection timed out after ${timeout}ms.`)));
        }, timeout);

        const usbmuxdSocket = createUsbmuxdConnection(() => {
            complete(() => {
                usbmuxdSocket.end();
                resolve();
            });
        });

        usbmuxdSocket.on("error", (e) => {
            complete(() => reject(e));
        });
    });
}

export async function startUsbmuxdReverseProxy(url: string) {
    logger.log(`Connecting to "${url}"`);

    return new Promise<void>((resolve, reject) => {
        let completed = false;
        const ws = new WebSocket(url);

        ws.on('error', (e) => {
            logger.error(e);
            if (!completed) { reject(e); }
        });

        ws.on('open', () => {
            logger.log(`Connected to "${url}"`);

            const wsStream = createWebSocketStream(ws);
            const mux = new BPMux(wsStream);

            mux.on("error", () => {}); // Ignore errors

            mux.on("peer_multiplex", (muxStream: Duplex) => {
                muxStream.on("error", () => {}); // Ignore errors

                try {
                    const usbmuxdSocket = createUsbmuxdConnection(() => {
                        usbmuxdSocket.pipe(muxStream).pipe(usbmuxdSocket);
                    });

                    usbmuxdSocket.on("error", (e) => {
                        logger.error("usbmuxd socket error:", e);
                    });

                    usbmuxdSocket.on("close", (hadError) => {
                        if (hadError) {
                            muxStream.end();
                        }
                    });
                } catch (e) {
                    logger.error("usbmuxd socket creation error:", e);
                    muxStream.end();
                }
            });

            ws.on('close', () => {
                wsStream.end();
            });

            if (!completed) { resolve(); }
        });

        ws.on('close', () => {
            logger.log(`Disconnected from ${url}`);
        });
    });
}
