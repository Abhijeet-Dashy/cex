import { useEffect } from "react";
import { WS_URL } from "@/lib/api";
import { useAccount } from "@/store/useAccount";
import { useStore } from "@/store/useStore";
import type { WsMessage } from "@/types";

const RECONNECT_DELAY_MS = 2000;
const ACCOUNT_REFRESH_DEBOUNCE_MS = 300;

/**
 * Keeps one WebSocket open to the exchange: subscribes to the current market's streams,
 * routes messages into the store and reconnects (reloading the snapshot) when the connection drops.
 */
export const useWebSocket = () => {
    const market = useStore((state) => state.market);

    useEffect(() => {
        let ws: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
        let refreshTimer: ReturnType<typeof setTimeout> | undefined;
        let stopped = false;

        const streams = [`ticker@${market}`, `depth@${market}`, `trade@${market}`];
        const store = useStore.getState();

        const handleMessage = (message: WsMessage) => {
            switch (message.data?.e) {
                case "ticker":
                    store.updateTicker(message.data);
                    break;
                case "depth":
                    store.updateOrderbook(message.data);
                    break;
                case "trade":
                    store.addTrade(message.data);
                    // a trade may have filled one of our orders: refresh balances and orders shortly
                    clearTimeout(refreshTimer);
                    refreshTimer = setTimeout(() => useAccount.getState().refresh(), ACCOUNT_REFRESH_DEBOUNCE_MS);
                    break;
            }
        };

        const connect = () => {
            ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                store.setConnected(true);
                ws?.send(JSON.stringify({ method: "SUBSCRIBE", params: streams }));
                // subscribe first, then load the snapshot, so no update is lost in between
                store.loadSnapshot();
            };

            ws.onmessage = (event) => {
                try {
                    handleMessage(JSON.parse(event.data));
                } catch (err) {
                    console.error("Failed to parse WS message", err);
                }
            };

            ws.onclose = () => {
                store.setConnected(false);
                if (!stopped) {
                    reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
                }
            };
        };

        connect();

        return () => {
            stopped = true;
            clearTimeout(reconnectTimer);
            clearTimeout(refreshTimer);
            ws?.close();
        };
    }, [market]);
};
