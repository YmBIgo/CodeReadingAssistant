import { WebSocketServer } from "ws";

function createServer() {
    const server = new WebSocketServer({ port: 8081 });
    server.on("connection", (socket) => {
        async function say(content: string): Promise<void> {
            const sayContentJson = JSON.stringify({
                type: "say",
                content
            });
            socket.send(sayContentJson);
        }
        async function ask(content: string): Promise<void> {
            
        }
    })
}