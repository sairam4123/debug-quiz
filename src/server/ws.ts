import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { appRouter } from "./api/root";
import { createTRPCContext } from "./api/trpc";

const wss = new WebSocketServer({
    port: 3001,
});

const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext: async (opts) => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(opts.req.headers)) {
            if (typeof value === "string") {
                headers.set(key, value);
            } else if (Array.isArray(value)) {
                value.forEach((v) => headers.append(key, v));
            }
        }

        return createTRPCContext({ headers });
    },
});

wss.on("connection", (ws) => {
    console.log(`++ Connection (${wss.clients.size})`);
    ws.once("close", () => {
        console.log(`-- Connection (${wss.clients.size})`);
    });
});

console.log("WebSocket Server listening on ws://localhost:3001");

process.on("SIGTERM", () => {
    console.log("SIGTERM");
    handler.broadcastReconnectNotification();
    wss.close();
});
