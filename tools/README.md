# tools

## parse_cards.py

総務省「市町村決算カード」（福島県分のPDF）から、指定した市の欄を機械的に読み取るスクリプトです。
`src/data/kessan-timeseries.json`（南相馬市の推移）と `src/data/kessan-compare.json`（県内7市の比較）の元になっています。

使い方（Python 3 と pdfplumber が必要）:

1. 総務省の決算カードページ（https://www.soumu.go.jp/iken/zaisei/card.html）から、各年度の福島県分PDFを `cards/<西暦年度>.pdf` に保存し、`cards/files.json` に `{ "2024": { "url": "...", "file": "cards/2024.pdf" }, ... }` の形で一覧を書く
2. `python3 tools/parse_cards.py` を実行すると `cards/parsed.json` ができる。別の市を読むときは `CITY=相馬市 OUT=cards/parsed_相馬市.json python3 tools/parse_cards.py`
3. 必要な項目を `src/data/*.json` の形に整える

財政力指数・経常収支比率・実質公債費比率・将来負担比率は、総務省「主要財政指標一覧」（https://www.soumu.go.jp/iken/shihyo_ichiran.html）の全市町村Excelから取ると確実です。決算カードから読んだ値と一致することは確認済みです。

PDFのレイアウトは年度で少し違うため、読み取りは完全ではありません。値が抜けた年は null になります。元の決算カードを正としてください。

## odaka-data.test.mjs

`src/data/odaka-timeline.json`・`odaka-projects.json`・`odaka-numbers.json`（ミニアプリ「小高 復興のあゆみ」）の構造を確かめます。出典の有無、`verified` と `note` の対応、年表の並び順、`projectId` の参照先、数字の型を見ます。あわせて、要約（`summary`）は一文、本文・注記（`body`・`note`）に URL を書かない、`current[].asOf` は「時点」「現在」「更新」を付けない裸の日付・期間、数字の `yearSuffix` は「年」か「年度」、という書き方の規約も確かめます。中身の事実関係は見ません。

```sh
npm test
```

## questions-data.test.mjs / questions-stats.test.mjs

`questions-data.test.mjs` は `src/data/questions.json`・`questions-analysis.json`・`questions-meta.json`（ミニアプリ「一般質問 みんなの論点」）の構造を確かめます。id の一意性と参照先、分野・方向性の値、方向性があるときの答弁・判定理由の有無、未収録の定例会の `note`、要約に URL を書かないこと、分析の質問 id と分野の一致を見ます。中身の事実関係は見ません。

`questions-stats.test.mjs` は集計関数 `src/lib/questions-stats.mjs` を確かめます。

## contact.test.mjs

お問い合わせ・後援会入会申し込みの検証とメール組み立て `src/lib/contact.mjs` を確かめます。必須・形式・長さ、「電話かメールのどちらか」、郵便番号の正規化、件名と本文、返信先の有無を見ます。
