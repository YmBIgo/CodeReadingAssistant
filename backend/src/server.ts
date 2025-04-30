import { WebSocketServer } from "ws";
import pWaitFor from "p-wait-for";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

import { Message } from "./type/Message";
import { ReadCodeAssistant } from "./assistant";
import { AskResponse } from "./type/Response";

function createServer(goplsPath: string) {
    const server = new WebSocketServer({ port: 8081 });
    server.on("connection", (socket) => {
        const codeReadingAssistant = new ReadCodeAssistant(ask, say, sendState, goplsPath);
        async function say(content: string): Promise<void> {
            const sayContentJson = JSON.stringify({
                type: "say",
                content
            });
            socket.send(sayContentJson);
        }
        async function ask(content: string): Promise<AskResponse> {
            const askContentJson = JSON.stringify({
                type: "ask",
                content
            });
            socket.send(askContentJson);
            await pWaitFor(() => !!codeReadingAssistant.askResponse, {interval: 500});
            const response: AskResponse = { ask: codeReadingAssistant?.askResponse ?? "unknown error" }
            codeReadingAssistant.clearWebViewAskResponse();
            return response;
        }
        async function sendState(messages: Message[]): Promise<void> {
            const stateContentJson = JSON.stringify({
                type: "state",
                messages
            });
            socket.send(stateContentJson);
        }
        socket.on('message', (message) => {
            try {
                const messageJson = JSON.parse(message.toString());
                switch (messageJson.type) {
                    case "Init":
                        const rootPath = messageJson.rootPath ?? "";
                        const rootFunctionName = messageJson.rootFunctionName ?? "";
                        const purpose = messageJson.purpose ?? "";
                        codeReadingAssistant.initializeAndRun(rootPath, rootFunctionName, purpose);
                        break;
                    case "Ask":
                        const askResponse = messageJson.askResponse;
                        codeReadingAssistant.handleWebViewAskResponse(askResponse);
                        break;
                    default:
                        break;
                }
            } catch (e) {
                console.error(e);
                return;
            }
        })
    })
}

async function main() {
    const rl = readline.createInterface({input, output})
    const goplsResult = await rl.question("Please Input Gopls Path");
    createServer(goplsResult);
}

main();