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
Kubelet PullImage
- /Users/coffeecup/Documents/open_source/kubernetes/kubernetes/staging/src/k8s.io/cri-client/pkg/remote_image.go
- r.pullImageV1
- KubeletがImageをPullしている関数の詳細を知りたい
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

/*
Argo-CD の cmpserver
- /Users/coffeecup/Documents/open_source/kubernetes/argo-cd/cmd/main.go
- cmpserver.NewCommand
- Argo-CDのcmpServerの仕組みを知りたい
*/

/*
prometheusのDiscoveryのpod
- /Users/coffeecup/Documents/open_source/kubernetes/prometheus/discovery/kubernetes/kubernetes.go
- func New(l *slog.Logger, metrics discovery.DiscovererMetrics, conf *SDConfig) (*Discovery, error) {
- prometheusのKubernetesのpodのDiscoveryをしている部分を知りたい
*/

/*
prometheusでscrapeがdiscoverを使っている箇所
- /Users/coffeecup/Documents/open_source/kubernetes/prometheus/scrape/scrape.go
- func newScrapePool(cfg *config.ScrapeConfig, app storage.Appendable, offsetSeed uint64, logger *slog.Logger, buffers *pool.Pool, options *Options, metrics *scrapeMetrics) (*scrapePool, error) {
- prometheusでscrapeがdiscoverを繋げている箇所(kubernetes)を知りたい
*/

/* prometheusのdiscovery Managerが各メトリクスを取得する部分が知りたい
- /Users/coffeecup/Documents/open_source/kubernetes/prometheus/discovery/manager.go
- func NewManager(ctx context.Context, logger *slog.Logger, registerer prometheus.Registerer, sdMetrics map[string]DiscovererMetrics, options ...func(*Manager)) *Manager {
- prometheusのdiscovery Managerが各メトリクスを取得する部分が知りたい
*/

// /Users/coffeecup/Documents/open_source/kubernetes/kubernetes/staging/src/k8s.io/kubectl/pkg/cmd/apply/apply.go
async function readRootPath() {
    return "/Users/coffeecup/Documents/open_source/kubernetes/kubernetes/pkg/kubelet/kubelet.go"
    const rl = readline.createInterface({input, output})
    const result = await rl.question("Please input Root Path which you want to see details\n");
    rl.close();
    return String(result)
}

// func (o *ApplyOptions) Run() error {
async function readRootFunction() {
    return "NewMainKubelet"
    const rl = readline.createInterface({input, output})
    const result = await rl.question("Please input Root Function Line which you want to see details\n");
    rl.close();
    return String(result)
}

// Want to know how "kubectl apply" work.
async function readPurpose() {
    return "Kubelet が criを操作している関数を知りたい"
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