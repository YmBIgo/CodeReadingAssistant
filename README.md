## What's is Code Reading Assistant

![CodeReadingAssistant-image](https://vulnhuntr.s3.us-west-1.amazonaws.com/codeReadingAssistant.png)

"Code Reading Assistant" is Web application / CLI tool which support user's code reading for golang using LLM(Claude).
User can use this tool to accelerate their code reading.
Since this tool only supports golang, I expect user to read CNCF's code faster using this tool.

## Motivation

I like code reading, and since that I have experience to fix bug in "Next.js".
Although I like code reading, There still some cumbersome problems when reading code.

1. When you are beginner of code base, you don't know any context, and since that code reading tend to be random walk.
2. When you go deeper of code base, you tend to forget where you come from.
3. When you read much, your eyes are being tired.
4. Since code reading is hard work, code base you can read in your life time would be limited.

When I thought these kind of thoughts, I found new idea about traversing code base.
It is security scan tool "Vulnhuntr".

https://github.com/protectai/vulnhuntr

The main idea of "Vulnhuntr" is combining LSP and LLM recursively to search important code.
And I found this idea can be applied to OSS Code Reading, and I try to use this tool in OSS (mostly CNCF) Code Reading now.

# What is difference between code reading using this agent and eye code reading

- Speed
Code Reading using this agent is better. I found I gain at least 2x faster for finding important functions, 3x faster for returning to original function, 5x faster for getting report summarizing code base.

- Accuracy of code route
Code Reading using this agent is better. When human read code, it sometimes become random walk. But since LLM knows architecture of code (like Kubernetes or argo-cd or prometheus or so on ...), LLM can pick good candidate of function in code base. So it is better for the beginner.

- Ability to code jump
Sometime human is better, but for most case equal. When This agent using "gopls implementation" to search code base, the accuracy of code reading is being worse, but this is not often happen.

## Usage for CLI tool (sorry only MAC user only...)

<Important> if you want to disable Japanese you can see "Tips" below.

0. setup environment (node, gopls)

```
brew install nodebrew # any thing you want
nodebrew use v20.5.0
brew install gopls
```

1. setup Claude API KEY

```bash
export CLAUDE_API_KEY=your-api-key
```

2. clone this repository and go to cli folder

```bash
git clone https://github.com/YmBIgo/TeachCode.git
cd cli
```

3. run start command

```bash
npm run start
```

4. Anser System's question

```bash
Please input Root Path which you want to see details
-> enter root path
Please input Root Function Line which you want to see details
-> enter root function code line , for example "func (o *ApplyOptions) Run() error"
Please input Purpose which you want to see details
-> enter purpose
```

5. LLM is going to search function you provide. And After that system would provide candidate function that LLM think is important, so you have to choose function you want to search more, like "0".

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

```response example
0
```

6. LLM is going to search the provided function, and run 5 - 6 recursively until you think it is enough.

7. In 5, you can do not only choosing candidate, but also "5.retry" or "6.showing history" or "7.get summary report". And you can go back to previous route by typing hash value which you can get by "6. showing history".

## Usage for Web Application (sorry only MAC user and Japanese only...)

Web Application is under construction, and content always could be changed.

0. setup environment (node, gopls)

```
brew install nodebrew # any thing you want
nodebrew use v20.5.0
brew install gopls
```

1. setup Claude API KEY

```bash
export CLAUDE_API_KEY=your-api-key
```

2. clone this repository

```bash
git clone https://github.com/YmBIgo/TeachCode.git
```

3. open two terminal, and at first terminal open backend and "npm run start", and enter gopls path.

```bash
cd backend
npm run start
-> you should enter "gopls path" (you can get by "which gopls" command)
```

4. at second terminal open front and "npm run dev"

```bash
cd front
npm run dev
```

5. Go to "localhost:5173" and enter rootPath, rootFunctionName, purpose

6. enter "Start Task" and you can start your task like CLI Tool.

## Tips

If you want to disable to Japanese you should remove

``` main_prompt
- Please respond "explain" by 日本語, but don't translate "function" or "codeLine".
```

```report_prompt
- Please respond by 日本語
```

from "src/prompt/index_ja.ts".