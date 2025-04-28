// kubernetes sample path /Users/coffeecup/Documents/open_source/kubernetes/kubernetes/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go

import { Choice, HistoryHandler, ProcessChoice } from "./history";
import { AnthropicHandler } from "./llm";
import fs from "fs/promises"
import { GoplsHandler, getFunctionContentFromFile } from "./lsp";
import Anthropic from "@anthropic-ai/sdk";
import { prompt, getReportPrompt } from "./prompt/index_ja";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

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
            let rawMessage = response.content[0].text.replace(/\t/g, "");
            rawMessage = rawMessage.replace("```json", "").replace(/```^/g, "") // FIXME : 本来はつけたくないが、3.7にした瞬間必要になった...
            parsedContent = JSON.parse(rawMessage)
        } catch (e) {
            console.error(e, response.content[0].text)
            return
        }
        if (!Array.isArray(parsedContent)) return;
        const fileContentArray = functionContent.split("\n");
        let newHistoryChoices: ProcessChoice[] = [];
        let parsedContentCodeLineArray: string[] = [];
        parsedContent.forEach((pc, index) => {
            const fileCodeLine = fileContentArray.find((fcr) => {
                if (fcr.includes(pc.codeLine.split(")")[0])) return true
            })
            ?? fileContentArray.find((fcr) => {
                const spaceRemovedRow = fcr.replace(/ /g, "").replace(/\t/g, "");
                if (spaceRemovedRow.startsWith("//") || spaceRemovedRow.startsWith("/*")) return false
                const isFunctionString = new RegExp(`"[\\s\\S]*${pc["function"]}[\\s\\S]*"`, "g").exec(fcr)
                if (isFunctionString) return false
                const isFunctionString2 = new RegExp(`'[\\s\\S]*${pc["function"]}[\\s\\S]*'`, "g").exec(fcr)
                if (isFunctionString2) return false
                const isFunctionString3 = new RegExp(`\`[\\s\\S]*${pc["function"]}[\\s\\S]*\``, "g").exec(fcr)
                if (isFunctionString3) return false
                const isFunctionNameInclude = new RegExp(`[ .\t]{1}${pc["function"]}[ (.:,]{1}`).exec(fcr);
                return Boolean(isFunctionNameInclude);
                // return fcr.includes(` ${pc["function"]}`) || fcr.includes(`.${pc["function"]}`);
            }) ?? pc.codeLine;
            parsedContentCodeLineArray.push(fileCodeLine)
            console.log(`${index} : ${pc["function"]}`);
            console.log(`Details : ${pc.explain}`);
            console.log(`Whole CodeLine : ${fileCodeLine}`);
            console.log(`Confidence: ${pc.confidence}`);
            console.log("-----------------");
            newHistoryChoices.push({
                functionName: pc["function"],
                functionCodeLine: fileCodeLine,
                originalFilePath: currentPath,
            } as ProcessChoice);
        })
        const rl = readline.createInterface({input, output});
        const result = await rl.question(`Please Input Index which you want to see details
※：enter 5 to retry. enter 6 to show history. enter 7 to get report. enter 8 to show current file.
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
        if (resultNumber === 8) {
            console.log("\n\n" + functionContent + "\n\n");
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
            parsedContentCodeLineArray[resultNumber],
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