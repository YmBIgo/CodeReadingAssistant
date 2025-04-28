import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { ReadCodeAssistant } from "./process";

/*
Kubelet
- /Users/coffeecup/Documents/open_source/kubernetes/kubernetes/pkg/kubelet/kubelet.go
- NewMainKubelet
- Kubelet が criを操作している関数を知りたい
*/

/*
Kubernetes Schedular
- /Users/coffeecup/Documents/open_source/kubernetes/kubernetes/pkg/scheduler/scheduler.go
- New
- Kubernetes の Scheduler の重要箇所を知りたい
*/

/*
Argo-CD
- /Users/coffeecup/Documents/open_source/kubernetes/argo-cd/cmd/main.go
- appcontroller.NewCommand
- Argo-CDを読み始めたばかりだが、Controller について知りたい
 */

/*
Argo-CD Controller compareAppState
- /Users/coffeecup/Documents/open_source/kubernetes/argo-cd/controller/state.go
- CompareAppState
- Argo-CD の Controller が、ステートを比較している部分を知りたい
*/

/*
Argo-CD Controller GetRepoObjs
- /Users/coffeecup/Documents/open_source/kubernetes/argo-cd/controller/state.go
- GetRepoObjs
- Argo-CD の Controller が、新旧のステートを取得している部分を知りたい
*/

/*
Argo-CD Repo reposerver.NewCommand
- /Users/coffeecup/Documents/open_source/kubernetes/argo-cd/cmd/main.go
- reposerver.NewCommand
- Argo-CD の RepoServer が何をしているか知りたい
*/

/*
Argo-CD Repo reposerver.NewCommand
- /Users/coffeecup/Documents/open_source/kubernetes/argo-cd/cmd/main.go
- reposerver.NewCommand
- Argo-CD の RepoServer が gitのrepoをどう取得しているか知りたい
*/

// /Users/coffeecup/Documents/open_source/kubernetes/kubernetes/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go
async function readRootPath() {
    return "/Users/coffeecup/Documents/open_source/kubernetes/argo-cd/cmd/main.go"
    const rl = readline.createInterface({input, output})
    const result = await rl.question("Please input Root Path which you want to see details\n");
    rl.close();
    return String(result)
}

// func (o *ApplyOptions) Run() error {
async function readRootFunction() {
    return "reposerver.NewCommand"
    const rl = readline.createInterface({input, output})
    const result = await rl.question("Please input Root Function Line which you want to see details\n");
    rl.close();
    return String(result)
}

// Want to know how "kubectl apply" work.
async function readPurpose() {
    return "Argo-CD の RepoServer が gitのrepoをどう取得しているか知りたい"
    const rl = readline.createInterface({input, output})
    const result = await rl.question("Please input Purpose which you want to see details\n");
    rl.close();
    return String(result)
}

async function main() {
    const rootPath = await readRootPath();
    const rootFunction = await readRootFunction();
    const purpose = await readPurpose();
    const process = new ReadCodeAssistant(rootPath, rootFunction, purpose)
}

main();