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

export async function startUsbmuxdReverseProxy(url: string) {
    logger.log(`Connecting to "${url}"`);

    return new Promise<void>((resolve, reject) => {
        let resolved = false;
        const ws = new WebSocket(url);

        ws.on('error', (e) => {
            logger.error(e);
            if (!resolved) { reject(e); }
        });

        ws.on('open', () => {
            logger.log(`Connected to "${url}"`);

            const wsStream = createWebSocketStream(ws);
            const mux = new BPMux(wsStream);

            mux.on("error", () => {}); // Ignore errors

            mux.on("peer_multiplex", (muxStream: Duplex) => {
                muxStream.on("error", () => {}); // Ignore errors

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
            });

            ws.on('close', () => {
                wsStream.end();
            });

            if (!resolved) { resolve(); }
        });

        ws.on('close', () => {
            logger.log(`Disconnected from ${url}`);
        });
    });
}
