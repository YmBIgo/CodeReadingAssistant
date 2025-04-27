// kubernetes sample path /Users/coffeecup/Documents/open_source/kubernetes/kubernetes/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go

import { Choice, HistoryHandler, ProcessChoice } from "./history";
import { AnthropicHandler } from "./llm";
import fs from "fs/promises"
import { GoplsHandler, getFunctionContentFromFile } from "./lsp";
import Anthropic from "@anthropic-ai/sdk";
import { prompt } from "./prompt/index_ja";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { getReportPrompt } from "./prompt";

const saveDataFolder = "/Users/coffeecup/Desktop/sandbox/readCodeAssistant"

export class ReadCodeAssistant {
    private apiHandler: AnthropicHandler;
    private historyHandler: HistoryHandler;
    private rootPath: string;
    private rootFunctionName: string;
    private purpose: string;

    constructor(rootPath: string, rootFunctionName: string, purpose: string) {
        this.rootPath = rootPath;
        this.rootFunctionName = rootFunctionName;
        this.purpose = purpose;
        this.apiHandler = new AnthropicHandler();
        this.historyHandler = new HistoryHandler(this.rootPath, this.rootFunctionName, this.rootFunctionName);
        console.log(`\nStarting Task...
EntryFile @${rootPath}
EntryFunction @${rootFunctionName}
-------`)
        this.run();
    }

    private run() {
        this.runInitialTask(this.rootPath, this.rootFunctionName)
    }

    private async runInitialTask(currentPath: string, currentFunctionLine: string) {
        let fileContent: string = "";
        try {
            fileContent = (await fs.readFile(currentPath)).toString();
        } catch(e) {
            console.error(e);
            return;
        }
        const fileContentArray = fileContent.split("\n");
        const startRow = fileContentArray.findIndex((fc) => fc.includes(currentFunctionLine));
        if (startRow === -1) return;
        const functionContent = await getFunctionContentFromFile(currentPath, startRow);
        if (!functionContent) return;
        this.runTask(currentPath, functionContent)
    }
    private async runTask(currentPath: string, functionContent: string) {
        const userPrompt = `
\`\`\`purpose
${this.purpose}
\`\`\`

\`\`\`code
${functionContent}
\`\`\`;
`
        const history: Anthropic.MessageParam[] = [{role: "user", content: userPrompt}];
        const response = await this.apiHandler.createMessage(prompt, history)
        const type = response.content[0].type;
        if (type !== "text") return;
        let parsedContent;
        try {
            parsedContent = JSON.parse(response.content[0].text.replace(/\t/g, ""))
        } catch (e) {
            console.error(e, response.content[0].text)
            return
        }
        if (!Array.isArray(parsedContent)) return;
        let newHistoryChoices: ProcessChoice[] = []
        parsedContent.forEach((pc, index) => {
            console.log(`${index} : ${pc["function"]}`);
            console.log(`Details : ${pc.explain}`);
            console.log(`Whole CodeLine : ${pc.codeLine}`);
            console.log(`Confidence: ${pc.confidence}`);
            console.log("-----------------");
            newHistoryChoices.push({
                functionName: pc["function"],
                functionCodeLine: pc.codeLine,
                originalFilePath: currentPath,
            } as ProcessChoice);
        })
        const rl = readline.createInterface({input, output});
        const result = await rl.question(`Please Input Index which you want to see details
※：enter 5 to retry. enter 6 to show history. enter 7 to get report.
※：If you enter string, it is recognized as hash value to search history.
`);
        let resultNumber = Number(result);
        rl.close();
        if (isNaN(resultNumber)) {
            this.runHistoryPoint(result);
            return;
        }
        if (resultNumber === 5) {
            this.runTask(currentPath, functionContent)
            return
        }
        if (resultNumber === 6) {
            this.historyHandler.showHistory();
            const rl2 = readline.createInterface({input, output})
            const result2 = await rl2.question(`Please Input Index which you want to see details
※：enter 5 to retry.
`);
            rl2.close();
            resultNumber = Number(result2);
            if (isNaN(resultNumber)){
                this.runHistoryPoint(result2)
                return;
            }
            if (resultNumber === 5) {
                this.runTask(currentPath, functionContent)
                return
            }
        }
        if (resultNumber === 7) {
            await this.getReport();
            const rl2 = readline.createInterface({input, output})
            const result2 = await rl2.question(`Please Input Index which you want to see details
※：enter 5 to retry.
`);
            rl2.close();
            resultNumber = Number(result2);
            if (isNaN(resultNumber)){
                this.runHistoryPoint(result2)
                return;
            }
            if (resultNumber === 5) {
                this.runTask(currentPath, functionContent)
                return
            }
        }
        if (!parsedContent[resultNumber]) return;
        this.historyHandler.addHistory(newHistoryChoices);
        const goplsHanlder = new GoplsHandler(currentPath, "/opt/homebrew/bin/gopls");
        await goplsHanlder.readFile();
        const file = await goplsHanlder.searchNextFunction(
            parsedContent[resultNumber].codeLine,
            parsedContent[resultNumber]["function"]
        )
        if (!file) {
            console.warn("gopls file not found...")
            return
        }
        const [newFilePath, newFileContent] = file
        this.historyHandler.choose(resultNumber, newFileContent)
        console.log(`\nSearching for @${newFilePath}\n`)
        this.runTask(newFilePath, newFileContent)
    }
    private runHistoryPoint(historyHash: string) {
        const newRunConfig = this.historyHandler.moveById(historyHash);
        if (!newRunConfig) return;
        const { functionCodeLine, originalFilePath } = newRunConfig;
        this.runInitialTask(originalFilePath, functionCodeLine);
    }
    private async getReport() {
        const [result, functionResult] = this.historyHandler.traceFunctionContent()
        console.log(`Generate Report related to "${functionResult}"`);
        const userPrompt = `\`\`\`purpose
${this.purpose}
\`\`\`

${result}`;
        const history: Anthropic.MessageParam[] = [{role: "user", content: userPrompt}];
        const response = await this.apiHandler.createMessage(getReportPrompt, history);
        const type = response.content[0].type;
        if (type !== "text") return;
        const res = response.content[0].text + "\n\n - Details \n\n" + result;
        const fileName = `report_${Date.now()}.txt`;
        await fs.writeFile(`${saveDataFolder}/${fileName}`, res);
        console.log(`Generate Report successfully @${saveDataFolder}/${fileName}`);
    }
}