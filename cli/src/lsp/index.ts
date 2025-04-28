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
    const selectedFileContent = fileContentSplit.slice(startRow - 1, startRow + 3) // FIXME : 本当はやりたくないが、Claudeに少しだけ投げると変な返答が返ってくるので...
    if (!selectedFileContent.join("\n").includes("func ") && !selectedFileContent.join("\n").includes("{")) {
        return selectedFileContent.join("\n")
    }
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
        let functionIndex = wholeCodeLine.indexOf(functionName);
        if (functionIndex === -1) {
            console.warn(`functionName not fount @${codeLine}`);
            const functionIndex2 = codeLine.indexOf(functionName);
            if (functionIndex2 === -1) return null;
            functionIndex = functionIndex2;
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
        const parsedFile = await this.parseStdoutFilePath(stdoutFilePath, codeLineIndex);
        if (parsedFile) {
            const [filePath, fileContent] = parsedFile
            return [filePath, fileContent];
        }
        const findImplementationCommand = `cd ${path.dirname(this.filePath)}; ${this.goplsPath} implementation ${this.filePath}:${codeLineIndex}:${functionIndex}`;
        console.log("\n\nexec command again : ", findImplementationCommand);
        const {stdout: stdout2, stderr: stderr2} = await execa({shell: true})`${findImplementationCommand}`;
        if (stderr) {
            console.error(`error occurs: ${stderr2}`);
            return null;
        }
        console.log(stdout2);
        if (!stdout) return null;
        const parsedFile2 = await this.parseStdoutFilePath(stdout2.split("\n")[0], codeLineIndex);
        if (parsedFile2) {
            const [filePath2, fileContent2] = parsedFile2;
            return [filePath2, fileContent2];
        }
        return null;
    }
    private async parseStdoutFilePath(filePath: string, codeLineIndex: number): Promise<[string, string] | null> {
        const splitFilePath = filePath.split("/");
        const fileInfo = splitFilePath[splitFilePath.length - 1];
        const fileName = fileInfo.split(":")[0];
        const resultFilePath = [...splitFilePath.slice(0, splitFilePath.length - 1), fileName].join("/");
        const fileRow = Number(fileInfo.split(":")[1]);
        if (fileRow === codeLineIndex) return null
        const fileContent = await getFunctionContentFromFile(resultFilePath, fileRow);
        return [resultFilePath, fileContent ?? ""];
    }
}