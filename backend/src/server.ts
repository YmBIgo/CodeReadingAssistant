import { WebSocketServer } from "ws";
import pWaitFor from "p-wait-for";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

import { Message } from "./type/Message";
import { ReadCodeAssistant } from "./assistant";
import { AskResponse } from "./type/Response";
// import { raceWaitFor } from "./util/raceWaitFor";

let codeReadingAssistant: ReadCodeAssistant;

function createServer(goplsPath: string) {
    const server = new WebSocketServer({ port: 8081 });
    server.on("connection", (socket) => {
        async function say(content: string): Promise<void> {
            const sayContentJson = JSON.stringify({
                type: "say",
                say: content
            });
            socket.send(sayContentJson);
        }
        async function ask(content: string): Promise<AskResponse> {
            codeReadingAssistant.clearWebViewAskResponse();
            const askContentJson = JSON.stringify({
                type: "ask",
                ask: content
            });
            socket.send(askContentJson);
            await pWaitFor(() => {
                return !!codeReadingAssistant.getWebViewAskResponse()
            }, {interval: 500});
            const response: AskResponse = { ask: codeReadingAssistant?.getWebViewAskResponse() ?? "unknown error" }
            console.log("response : ", response)
            return response;
        }
        function sendState(messages: Message[]): void {
            const stateContentJson = JSON.stringify({
                type: "state",
                state: messages
            });
            socket.send(stateContentJson);
        }
        codeReadingAssistant = new ReadCodeAssistant(ask, say, sendState, goplsPath);
        socket.on('message', (message) => {
            try {
                const messageJson = JSON.parse(message.toString());
                console.log(messageJson)
                switch (messageJson.type) {
                    case "Init":
                        const rootPath = messageJson.rootPath ?? "";
                        const rootFunctionName = messageJson.rootFunctionName ?? "";
                        const purpose = messageJson.purpose ?? "";
                        codeReadingAssistant.initializeAndRun(rootPath, rootFunctionName, purpose);
                        break;
                    case "Ask":
                        const askResponse = messageJson.askResponse;
                        console.log("receive message", askResponse)
                        codeReadingAssistant.handleWebViewAskResponse(askResponse);
                        break;
                    case "Reset":
                        codeReadingAssistant = new ReadCodeAssistant(ask, say, sendState, goplsPath);
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

async function readGopls() {
    const rl = readline.createInterface({input, output})
    const goplsResult = await rl.question("Please Input Gopls Path\n");
    rl.close();
    return goplsResult
}

(async() => {
    const goplsResult = await readGopls();
    createServer(goplsResult);
})()