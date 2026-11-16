import { WebSocketServer } from "ws";
import { UserManager } from "./UserManager";

const PORT = Number(process.env.WS_PORT ?? 8080);

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
    UserManager.getInstance().addUser(ws);
});

console.log(`WebSocket server listening on ws://localhost:${PORT}`);
