## LLMの与えた衝撃

LLM はプログラミングを変えました。
今やプログラミングは、文法を通じて機械を操縦する道具ではなく、自然言語を入力として機械を操縦する道具と化しました。
Cline, Cursor, Copilot など... 既存のツールにとどまらず、今後もその進化は続いていくことでしょう。

その潜在的な進化の余地に、OSSなどの大規模コードを読むことも含まれると思います。
ここでは、OSSなどの大規模コードを読むことにどのように LLMを使えるかを議論します（コードとしてCLIツールを作っていますが、また別の機会に公開しようと思います）。

## Code Reading Agent とは？

Code Reading Agent とは、「コードリーディングの目的」と「コードリーディングを開始する関数」を入力として、LLMを使って関連しそうな関数をコードから探し、それを再帰的に読ませるエージェントです。
ユーザーはLLMの探索する関数の経路を制御したり、関数の経路からまとめレポートをLLMに書き出させたり、過去に通った経路に戻ることもできます。

今のところ kubernetes, argo-cd, prometheusの一部を、このAgentを使って読んだ感想としては、効果としてなんの知識もなく目で追うと１時間かかりそうな目的の関数まで10分程度でたどり着くようなことも可能だと思っています。

## Code Reading Agent を作る意義・きっかけ

自分もコードを読むのは好きで、OSS で言えば Next.js のようなコードを読んで、そのバグを直したこともあるんですが、このコードリーディングって結構きついんですよね。
そのキツさには、４種類あると思っています。

1. 最初に読み始めるときは文脈がわからないため、何が重要な関数か分からない

2. 関数を深掘りするとき、元の関数がどうだったのか忘れがち

3. 目だけでコードを追うのは目に負担がかかる。つまり目が疲れる。

4. 目でコードリーディングするのは結構労力がかかるので、人の力で一生に読めるレポジトリーの数に限りがありそう

そんなことを考えていた時に、コード把握に関して新しい考え方が出てきました。
それが、LLMを使ったセキュリティスキャンツールの

https://github.com/protectai/vulnhuntr

です。
簡単にいうと、「LLMで関数探索をし重要な部分を抽出してもらい、その中身をLSPでジャンプする、という工程を再帰的に行うことで、セキュリティスキャンをしよう」という考え方です。
これをコードリーディングに使えないか？というのが今回の Code Reading Agent 作成のきっかけでした。
実際作ってみてからの、デバッグは CNCFプロジェクトの golang の巨大OSSで試しています。

## Code Reading Agent と 目grep のコードリーディングの違い

- 速さ
  Code Reading Agent の方が優れている。大きい関数の中身を見ることと過去に見た関数に戻ることとまとめレポートを作ることという3点に関して言えば、圧倒的にLLMの方が速い。
  体感だと、関数を見ることは最低限2倍・戻ることは4倍以上・レポート作成は5倍以上の速さでできます。
- 巨大なコードから重要な関数を見つける正確さ（経路の正確性）
  Code Reading Agent の方が、最初に見るコードだと優れている。自分なんかはいきなり目で「ReactのReconcile loopを探しだせ」と考えたものの見つけられなかった以来、Reactはあまり読んでいないので、最初に見るコードベースで重要な関数を見つけるのは至難の業です。その点最初に読むコードであれば、Agentの方が正確です。
- コードジャンプ力
  人の方が正確な場合がありますが、ほぼ同等です。現状自分が作っているの Code Reading Agent では 例えば「gopls implementation」で複数候補があった時のジャンプ先を正確に決めていませんし、全て探索するようなこともしていません。
- 戻る時の間違いしにくさ
  関数を戻る時の機能がAgentには入っているので、Agentの方が正確にコードを戻れます。これは少し後述します。

## Code Reading Agent の詳細

具体的には、以下の手順で進めます。

１：prometheusのDiscovery Managerのコードベースを知りたいので、以下をAgentに渡します。

```code_path
path_to_folder/prometheus/discovery/manager.go
```

```function_name
func NewManager(ctx context.Context, logger *slog.Logger, registerer prometheus.Registerer, sdMetrics map[string]DiscovererMetrics, options ...func(*Manager)) *Manager {
```

```purpose
prometheusのdiscovery Managerが各メトリクスを取得する部分が知りたい
```

２：LLMが対象の関数のコードを検索し、重要な関数を以下のように5つまで示します

```candidate
0 : Manager
Details : Prometheusのディスカバリーマネージャーの中核となる構造体です。メトリクス収集のための同期チャネル、ターゲットグループの管理、メトリクスの登録などの重要な機能を統合します。
Whole CodeLine : 	mgr := &Manager{
Original Code :  mgr := &Manager{
Confidence: 90
-----------------
1 : targetgroup.Group
Details : 監視対象のグループを表現する構造体で、実際のメトリクス収集先となるターゲットの情報を保持します。ディスカバリーされたターゲットの同期に使用されます。
Whole CodeLine : syncCh: make(chan map[string][]*targetgroup.Group),
Original Code :  syncCh: make(chan map[string][]*targetgroup.Group),
Confidence: 85
-----------------
2 : NewManagerMetrics
Details : ディスカバリーマネージャーのメトリクスを初期化する関数です。ディスカバリー処理自体のパフォーマンスや状態を監視するためのメトリクスを設定します。
Whole CodeLine : 	metrics, err := NewManagerMetrics(registerer, mgr.name)
Original Code :  metrics, err := NewManagerMetrics(registerer, mgr.name)
Confidence: 75
-----------------
3 : ManagerMetrics
Details : ディスカバリーマネージャーの動作状態を追跡するためのメトリクス構造体です。ディスカバリー処理の成功率やレイテンシーなどの重要な指標を保持します。
Whole CodeLine : 	mgr.metrics = metrics
Original Code :  mgr.metrics = metrics
Confidence: 70
-----------------
```

３：ユーザーは0〜4（上記例だと3まで）のうち、探索したい関数をAgentに指示

４：AgentはLSP（Language Server Protocol）を使い、再度その結果を使い２に再帰的を実行

５：３の段階で、以下の操作も可能。
　　A. コードの探索履歴を検索でき、特定の過去の検索経路から再度探索を開始する

```コードの探索履歴
|func NewManager(ctx context.Context, logger *slog.Logger, registerer prometheus.Registerer, sdMetrics map[string]DiscovererMetrics, options ...func(*Manager)) *Manager {
|883b806

  |Manager
  |65a3d40

    |startProvider
    |6a92ac7

    |updater
    |08a1386

    |Run
    |202418e

    |syncCh
    |59b10bd

    |updateGroup
    |0330c02

  |NewManagerMetrics
  |46154f7

  |targetgroup.Group
  |96efe69

  |DiscovererMetrics
  |732109a
```

　　B. ここまでの探索からレポートを出力させる

``` argo-cd の application controller に関するレポート
トレースされたコードから、Argo CDのApplicationControllerの主要な処理フローについて説明します。

1. **Reconcileのエントリーポイント**:
- `NewCommand()`でコントローラーの初期化とReconcileのための設定を行います
- 主な設定パラメータ:
  - リソース同期の間隔(appResyncPeriod)
  - ハード同期の間隔(appHardResyncPeriod) 
  - リポジトリサーバー接続設定
  - ワークキューの設定
  - メトリクス関連の設定

2. **Reconcileのメインループ**:
- `Run()` メソッドで複数のワーカーを起動し、以下のキューを並行処理:
  - appRefreshQueue: アプリケーションの状態更新
  - appOperationQueue: アプリケーションの操作実行
  - projectRefreshQueue: プロジェクトの更新

3. **アプリケーション状態の比較処理**:
`processAppRefreshQueueItem()`が主要な調整ロジックを実装:

- Gitリポジトリからマニフェストを取得
- クラスタから現在の状態を取得
- `CompareAppState()`で理想状態と現在の状態を比較
- 差分に基づいて同期ステータスを判定
- アプリケーションの健全性状態を更新

4. **状態の調整(Reconciliation)処理**:
`Reconcile()`で以下を実施:
- ターゲットオブジェクトとライブオブジェクトのマッピング
- フックの分離
- リソースの重複排除
- 管理対象リソースの特定

主な特徴:
- 宣言的な設定に基づく自動調整
- 複数のワーカーによる並行処理
- きめ細かな同期制御(通常同期/ハード同期)
- エラー時の再試行とグレースピリオド
- メトリクス収集による監視

このように、ApplicationControllerは GitOpsのパターンに従って、継続的にアプリケーションの理想状態と実際の状態を比較・調整する役割を担っています。
```

　　C. 内容が気に入らなかったら、もう一度LLMに検索させる
　　D. 今LLMに提示したコードの確認

６：ユーザーがOKだと思ったら終了する

このようにしてLLMと一緒にコードを読むことで、目で追うと１時間かかるような関数の探索も10分程度で終わらせることもできます。

LLMが適切な関数を提示してくれるか心配な方もいるかもしれません。
確かに、LLMは時にうまくいい関数を提示してくれない時もあります。ただ今のところ自分で kubernetes, argo-cd, prometheus のコードを読んでもらったところ、LLMはアーキテクチャ理解できているようで、アーキテクチャに沿ったそれっぽいコードを提示してくれいていました。

## golang で Code Reading Agent を作る上での障壁

Code Reading Agent は言語ごとの特徴に合わせて作らないといけないので、汎用的に全ての言語で使えるものを作るのは至難の業だと思っています。
そういうわけで、golang で作った時にどのような壁があったかを書き連ねます。

1. interface embedding に対応する必要があった
2. 関数対応だけで十分だと思っていたが、method, struct対応も必要だった
3. LLMがハルシネーションを起こし、変なコードを推薦してしまう場合がたまにあった→フェイルセーフを加えた
4. gopls definition で同じ関数を提示された時用に、gopls implementation で検索する分岐を作る必要があった

このLLMとの対話とプロンプトの進化を、もう一度TypeScriptでやるのは面倒ですね...
いずれにせよ、簡単めな構文の golang ですらこうなんで、c++ や rust はどうなるのやら...とは思ってしまいますね。

## 今後の展望

今手元にあるツールは、CLIツールなので、VS Code 拡張機能にしたいですね。
もし余裕があったら、TypeScript用のツールも作りたいです。
今後はどのようなエンジニアでもOSSコードリーディングができる社会がくれば面白なと思っています。

## 【付録】ここまでで育ててきたプロンプト

golang 用ですが、ここまでで作ったプロンプトです。
「golang は class がないから簡単ではないか？」と思ったのですが、"interface embedding" など意外と考慮必要なな部分もありました。

```prompt
You are "Read Code Assistant", highly skilled software developer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.

===

CAPABILITIES

- You can read and analyze code in Go language, and can evaluate the most valuable functions or methods or types in specific function.

===

RULES

- User would provide you the "the purpose of code reading" and "a whole code of specific functions or methods or types in the project", and you have to return json-formatted content of "the 1~5 most valuable functions related to purpose with explanation of each function and code line which include the function and the confidence of the achievement of purpose".
  [example]
  <user>
\`\`\`purpose
Want to know how generation of articles are handled.
\`\`\`

\`\`\`code
func main() {
	flag.Parse()

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.URLFormat)
	r.Use(render.SetContentType(render.ContentTypeJSON))

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("root."))
	})

	r.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("pong"))
	})

	r.Get("/panic", func(w http.ResponseWriter, r *http.Request) {
		panic("test")
	})

	// RESTy routes for "articles" resource
	r.Route("/articles", func(r chi.Router) {
		r.With(paginate).Get("/", ListArticles)
		r.Post("/", CreateArticle)       // POST /articles
		r.Get("/search", SearchArticles) // GET /articles/search

		r.Route("/{articleID}", func(r chi.Router) {
			r.Use(ArticleCtx)            // Load the *Article on the request context
			r.Get("/", GetArticle)       // GET /articles/123
			r.Put("/", UpdateArticle)    // PUT /articles/123
			r.Delete("/", DeleteArticle) // DELETE /articles/123
		})

		// GET /articles/whats-up
		r.With(ArticleCtx).Get("/{articleSlug:[a-z-]+}", GetArticle)
	})

	// Mount the admin sub-router, which btw is the same as:
	// r.Route("/admin", func(r chi.Router) { admin routes here })
	r.Mount("/admin", adminRouter())

	// Passing -routes to the program will generate docs for the above
	// router definition. See the \`routes.json\` file in this folder for
	// the output.
	if *routes {
		// fmt.Println(docgen.JSONRoutesDoc(r))
		fmt.Println(docgen.MarkdownRoutesDoc(r, docgen.MarkdownOpts{
			ProjectPath: "github.com/go-chi/chi/v5",
			Intro:       "Welcome to the chi/_examples/rest generated docs.",
		}))
		return
	}

	http.ListenAndServe(":3333", r)
}
\`\`\`
  <you>
[
  {
    "codeLine": "r.Post(\"/\", CreateArticle)       // POST /articles",
    "function": "CreateArticle",
    "explain": "システム内で新しい記事を作成するためのメインハンドラ関数です。/articles エンドポイントに対して POST リクエストが送られたときに、この関数が呼び出され、リクエストを処理して新しい記事を生成します。",
    "confidence": 90
  },
  {
    "codeLine": "r.Route(\"/articles\", func(r chi.Router) {",
    "function": "Route",
    "explain": "すべての記事関連の操作のルーティング構造を定義しており、記事処理専用のサブルーターを作成します。アプリケーション内での記事生成および管理機能のエントリーポイントです。",
    "confidence": 75
  },
  {
    "codeLine": "r.With(ArticleCtx).Get(\"/{articleSlug:[a-z-]+}\", GetArticle)",
    "function": "ArticleCtx",
    "explain": "このミドルウェア関数は、スラッグ識別子に基づいて記事データをロードするためのものと思われます。記事リクエストを処理するために、既存の記事を取得したり、記事作成用の環境を準備したりして、コンテキストを整えます。",
    "confidence": 60
  }
]

- If the code spans multiple lines, extract only the first line for content of "codeLine", but you must take special care for "interface embedding" to be specified.
- Please do not include any comments other than JSON.
- Please exclude the function being searched from the candidates.
- If return value is struct, you must add it as a candidate.
- If there are few candidates, please add methods as much as possible.

[example]
\`\`\`code
func (m *MetricsServer) GetHandler() http.Handler {
	return m.handler
}
\`\`\`
Please add "m.handler" as candidate.(Don't forget to add "m")

- Try not to select val as candidate

[example1]
\`\`\`code
klet.runtimeService = kubeDeps.RemoteRuntimeService
\`\`\`
-> not good : "klet.runtimeService" or "runtimeService"
-> good : "kubeDeps.RemoteRuntimeService" or "RemoteRuntimeService"

[example2]
\`\`\`code if struct
type Dependencies struct {
	RemoteRuntimeService      internalapi.RuntimeService
}
\`\`\`
-> not good : "RemoteRuntimeService"
-> good : "internalapi.RuntimeService" or "RuntimeService"

[example3]
\`\`\`code if interface
type ImageManagerService interface {
	ListImages(ctx context.Context, filter *runtimeapi.ImageFilter) ([]*runtimeapi.Image, error)
}
\`\`\`
-> not good : "runtimeapi.Image"
-> good : "ListImages"

- Don't forget to add "interface embedding" candidate.

[example]
\`\`\`code of interface
type RuntimeService interface {
	RuntimeVersioner
	UpdateRuntimeConfig(ctx context.Context, runtimeConfig *runtimeapi.RuntimeConfig) error
}
\`\`\`
-> not good : "UpdateRuntimeConfig" ("RuntimeVersioner" is not included, not enough)
-> good : "UpdateRuntimeConfig", "RuntimeVersioner"

- Do not return any "codeLine" that is not present in the original file content.

[example]
\`\`\`code that required to return "codeLine"
func newScrapePool(app storage.Appendable, metrics *scrapeMetrics) (*scrapePool){
  return sp := &scrapePool{
    appendable:           app,
	metrics:              metrics,
  }
}
\`\`\`

-> not good "codeLine" : "type scrapePool struct {" (it is definition, and not included code.)
-> good "codeLine" : "sp := &scrapePool{" (it is included in code.)

- Please respond "explain" by 日本語, but don't translate "function" or "codeLine".
- Respond only in valid JSON format
```