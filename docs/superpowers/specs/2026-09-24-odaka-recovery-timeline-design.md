# ミニアプリ「小高 復興のあゆみ」設計

日付: 2026-09-24

## 目的

震災後の小高区で、どんな計画・調査がつくられ、どんな事業が行われ、人口などの数字がどう動いたかを、一つの時間軸で見られるページをつくる。「計画や調査で示された課題が、現在の事業にどう反映され、何が残っているか」を確かめる入口にする。

対象読者は市民。試作版として公開し、中身は後から JSON を直して更新できるようにする。

## 方針

- 既存のミニアプリ「まちの健康診断」（`src/pages/apps/health.astro`）と同じ型で作る。Base レイアウト、パンくず、目次、prose 記事、`MiniChart`。
- 事実データはすべて JSON に置き、ページ側は表示だけを担う。
- 中身は市・県の公開資料を Web で調べて下書きし、出典 URL を付ける。公開資料で確認できない項目（例: 小高区再生調査）も年表に載せ、`verified: false` として「資料未確認」と明示する。
- 断定を避ける。記述は「資料によれば」「〜とされている」の形にとどめる。
- 数字は null を許容し、欠けた年は空にする。

## ページ構成

URL: `/apps/odaka/`（`src/pages/apps/odaka.astro`）。タイトル案「小高 復興のあゆみ」。

1. **ヒーロー**: 「ミニアプリ · 試作版」バッジ、見出し、リード、データ出典の一行。
2. **年表** (`#timeline`): 縦一本の時間軸に、計画・調査・事業・出来事を種類バッジ付きで並べる。
   - 上部に絞り込みボタン: すべて／計画・調査／事業／出来事。資料集の絞り込みと同じ仕組みで `src/scripts/site.js` に追加する。
   - `verified: false` の項目は「資料未確認」バッジと注記を表示する。
   - `projectId` を持つ項目は、主要事業カード（`#project-<id>`）へのアンカーリンクを持つ。
3. **主要事業の今** (`#projects`): 復興住宅、小高交流センター、小高ストア、フロンティアパーク、川房IC などをカードで並べる。
   - 状態（完成／整備中／計画中／中断）、概要、現状の数字（来場者数・売上など。時点と出典付き）。未完成のものは状況を文章で書く。
4. **数字で見る小高** (`#numbers`): `MiniChart` で3系列。居住人口（住民登録と実際の居住者数の2本）、移住者数、事業所・事業再開数。震災マークは既存の 2011 のまま。
5. **まだ確かめたいこと** (`#check`): 資料が見つからなかった点、数字の定義が揺れている点を列挙する。
6. **データと注意点** (`#method`): 出典一覧と限界。

## データ

### `src/data/odaka-timeline.json`

```json
{
  "note": "…",
  "items": [
    {
      "year": 2016, "month": 7,
      "kind": "event",
      "title": "避難指示解除",
      "summary": "一文の要約",
      "body": "任意。数文の説明",
      "projectId": "koryu-center",
      "sources": [{ "title": "資料名", "url": "https://…" }],
      "verified": true,
      "note": "任意。未確認の理由など"
    }
  ]
}
```

- `kind`: `plan`（計画）／`survey`（調査・ワークショップ）／`project`（事業の着手・完成）／`event`（出来事）。絞り込みでは `plan` と `survey` を「計画・調査」にまとめる。
- 並び順は `year`、`month` の昇順。同じ年月は JSON の順。
- `verified: false` のときは `sources` が空でもよい。`note` に理由を書く。

### `src/data/odaka-projects.json`

```json
{
  "items": [
    {
      "id": "koryu-center",
      "name": "小高交流センター",
      "category": "拠点施設",
      "status": "done",
      "start": 2016, "end": 2018,
      "summary": "一文の要約",
      "body": "任意。経緯と現状",
      "current": [{ "label": "来館者数", "value": "…人", "asOf": "2025年度", "source": "https://…" }],
      "sources": [{ "title": "資料名", "url": "https://…" }],
      "verified": true
    }
  ]
}
```

- `status`: `done`（完成・稼働中）／`building`（整備中）／`planned`（計画中）／`suspended`（中断・見直し）。
- `current` は表示用の文字列。未完成のものは空配列でよく、そのときは `body` に状況を書く。

### `src/data/odaka-numbers.json`

```json
{
  "series": [
    {
      "id": "residents",
      "title": "小高区の居住者数",
      "unit": "人",
      "kind": "line",
      "note": "市が公表する居住状況。時点は各年…",
      "source": { "title": "資料名", "url": "https://…" },
      "points": [{ "year": 2016, "label": "2016年", "value": 1234 }]
    }
  ]
}
```

- `points[].value` は null 可。`MiniChart` の `points` 形式（`year`, `label`, `value`）にそのまま渡す。
- 系列は最低3本: 居住人口（住民登録／居住者数）、移住者数、事業所・事業再開数。定義が資料によって違う場合は `note` に書く。

## コンポーネント

- `src/components/Timeline.astro`: 年表。`items` を受け取り、`<ol class="timeline">` に `<li data-kind="…">` を並べる。種類バッジ、年月、タイトル、要約、出典リンク、未確認バッジ、事業へのアンカーを描画する。
- `src/components/ProjectCard.astro`: 事業カード。`project` を受け取り、`id="project-<id>"` の `<article>` を描画する。状態バッジ、概要、現状の数字リスト、出典。
- `MiniChart.astro` は変更せず再利用する。
- CSS は `src/styles/global.css` に追記。760px 以下では年表を1列に、絞り込みボタンは折り返す。

## 絞り込みの動作

- ボタンは `data-filter="all|plan|project|event"`。`plan` は `kind` が `plan` または `survey` の項目にマッチする。
- `site.js` の資料集の絞り込みと同じ考え方で、`hidden` 属性の付け外しで実装する。JavaScript が無効でも全項目が表示される。

## リンクの追加

- `src/pages/index.astro` と `src/pages/resources.astro` のミニアプリ一覧にカードを追加する。
- `README.md` のファイル一覧に追記する。

## エラー処理・欠損

- 数字の null は `MiniChart` がそのまま飛ばす。
- `sources` が空の項目は出典リンクを出さない。`verified: false` なら「資料未確認」を必ず表示する。
- `projectId` が `odaka-projects.json` に存在しない場合はビルド時に警告を出し、リンクは付けない。

## 検証

- `npm run build` が通る（`nodebrew` の Node 22 を PATH に通す）。
- ブラウザで: 絞り込みボタンで年表の表示が切り替わる、年表から事業カードへのアンカーが動く、スマホ幅で崩れない、3つのグラフが描画される。
- 記述の確認: JSON の全項目に `sources` か `verified: false` のどちらかがある。

## 範囲外

- 市全体との比較、年齢構成や児童生徒数などの追加系列。
- 地図表示。
- 自動更新。数字は手で JSON を直す。
