import { execa } from "execa";
import fs from "fs/promises"
import path from "path";

export async function getFunctionContentFromFile(filePath: string, startRow: number) {
    let originalFileContent;
    try {
        originalFileContent = (await fs.readFile(filePath)).toString();
    } catch (e) {
        console.warn(e);
        return "";
    }
    const fileContentSplit = originalFileContent.split("\n");
    const fileContent = fileContentSplit.slice(startRow - 1);
    let fileResultArray = [];
    let startArrowCount = 0;
    let endArrowCount = 0;
    for(let row of fileContent){
        fileResultArray.push(row);
        startArrowCount += row.match(/\{/g)?.length ?? 0;
        endArrowCount += row.match(/\}/g)?.length ?? 0;
        if (startArrowCount === endArrowCount && startArrowCount + endArrowCount !== 0) {
            return fileResultArray.join("\n");
        }
    }
}

export class GoplsHandler {
    private filePath: string;
    private fileContent: string = "";
    private goplsPath: string;
    constructor(filePath: string, goplsPath: string) {
        this.filePath = filePath;
        this.goplsPath = goplsPath;
    }
    async readFile() {
        try {
            const fileContent = (await fs.readFile(this.filePath)).toString();
            this.fileContent = fileContent;
        } catch (e) {
            console.error(e)
            this.fileContent = ""
        }
    }
    private getSymbolPosition(codeLine: string, functionName: string): [number, number] | null {
        const fileContentArray = this.fileContent.split("\n")
        if (!fileContentArray.length) {
            return null;
        }
        let wholeCodeLine = ""
        const codeLineIndex = fileContentArray.findIndex((fc) => {
            const spaceRemovedFc = fc.replace(/ /g, "").replace(/\t/g, "")
            if (spaceRemovedFc.startsWith("//") || spaceRemovedFc.startsWith("/*")) return
            const isCodeLineRight = fc.includes(codeLine)
            if (isCodeLineRight) {
                wholeCodeLine = fc
                return true
            }
            const bracketRemovedCodeLine = codeLine.split("(")[0]
            const isBracketRemovedCodeLineRight = fc.includes(bracketRemovedCodeLine)
            if (isBracketRemovedCodeLineRight) {
                wholeCodeLine = fc
                return true
            }
            return false
        })
        if (codeLineIndex === -1) {
            console.warn(`codeLine not found @${this.filePath}`)
            return null;
        }
        const functionIndex = wholeCodeLine.indexOf(functionName);
        if (functionIndex === -1) {
            console.warn(`functionName not fount @${codeLine}`)
            return null;
        }
        return [codeLineIndex + 1, functionIndex + 1]
    }
    async searchNextFunction(codeLine: string, functionName: string): Promise<[string, string] | null> {
        const symbolIndex = this.getSymbolPosition(codeLine, functionName);
        if (!symbolIndex) return null;
        const [codeLineIndex, functionIndex] = symbolIndex
        const findReferenceCommand = `cd ${path.dirname(this.filePath)}; ${this.goplsPath} definition ${this.filePath}:${codeLineIndex}:${functionIndex}`;
        console.log("command : ", findReferenceCommand)
        const {stdout, stderr} = await execa({shell: true})`${findReferenceCommand}`;
        if (stderr) {
            console.error(`error occurs: ${stderr}`);
            return null;
        }
        console.log(stdout)
        if (!stdout) return null;
        const stdoutFilePath = stdout.split(": defined here")[0];
        const [filePath, fileContent] = await this.parseStdoutFilePath(stdoutFilePath);
        return [filePath, fileContent];
    }
    private async parseStdoutFilePath(filePath: string): Promise<[string, string]> {
        const splitFilePath = filePath.split("/");
        const fileInfo = splitFilePath[splitFilePath.length - 1];
        const fileName = fileInfo.split(":")[0];
        const resultFilePath = [...splitFilePath.slice(0, splitFilePath.length - 1), fileName].join("/");
        const fileRow = Number(fileInfo.split(":")[1]);
        const fileContent = await getFunctionContentFromFile(resultFilePath, fileRow);
        return [resultFilePath, fileContent ?? ""];
    }
}