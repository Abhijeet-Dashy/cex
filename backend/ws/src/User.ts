import { WebSocket } from "ws";
import { OutgoingMessage } from "./types/out";
import { SubscriptionManager } from "./SubscriptionManager";
import { parseIncomingMessage, SUBSCRIBE } from "./types/in";

export class User {
    constructor(private readonly id: string, private readonly ws: WebSocket) {
        this.addListeners();
    }

    emit(message: OutgoingMessage) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    private addListeners() {
        this.ws.on("message", (raw) => {
            const message = parseIncomingMessage(raw.toString());
            if (!message) {
                return;
            }
            const subscriptions = SubscriptionManager.getInstance();
            message.params.forEach(stream => {
                if (message.method === SUBSCRIBE) {
                    subscriptions.subscribe(this.id, stream);
                } else {
                    subscriptions.unsubscribe(this.id, stream);
                }
            });
        });
    }
}
