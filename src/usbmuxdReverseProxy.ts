import * as net from 'net';
import { WebSocket, createWebSocketStream } from 'ws';
// @ts-ignore
import { BPMux } from "bpmux";
import { Duplex } from 'stream';
import * as logger from './logger';

export function startUsbmuxdReverseProxy(url: string) {
    logger.log(`Connecting to "${url}"`);
    const ws = new WebSocket(url);

    ws.on('error', (e) => { logger.error(e); });

    ws.on('open', () => {
        logger.log(`Connected to "${url}"`);

        const wsStream = createWebSocketStream(ws);
        const mux = new BPMux(wsStream);

        mux.on("error", () => {}); // Ignore errors

        mux.on("peer_multiplex", (muxStream: Duplex) => {
            muxStream.on("error", () => {}); // Ignore errors

            const usbmuxdSocket = net.createConnection("/var/run/usbmuxd", () => {
                usbmuxdSocket.pipe(muxStream).pipe(usbmuxdSocket);
            });
        });

        ws.on('close', () => {
            wsStream.end();
        });
    });

    ws.on('close', () => {
        logger.log(`Disconnected from ${url}`);
    });
}
