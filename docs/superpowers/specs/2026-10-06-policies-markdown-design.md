# 取り組みページを frontmatter 付き Markdown にする 設計

日付: 2026-10-06

## 目的

`src/content/policies/*.yaml` は長文を `"..."` でくくり、改行を `\n`、リンクを `<a href=\"...\">` のエスケープで書く形になっていて編集しづらい。本文を Markdown で書けるよう、1 ページ = 1 つの `.md`（frontmatter + 本文）に移行する。

## 前提（調査で分かったこと）

- 取り組みは 5 本（`children / city-hall / economy / future / odaka-kashima`）。
- 読んでいる場所は 4 つ。一覧（`src/pages/policies/index.astro`）、トップのカード（`src/components/home/Policies.astro`）、資料集（`src/pages/resources/sources.astro`）は `order / badge / plain / title / lead / image / resources / id` しか使わない。詳細ページ（`src/pages/policies/[id].astro`）だけが `issue / actions / checks / goalHeading / goal` を使う。
- 詳細ページの 4 セクション（課題・提案・確かめたいこと・目指す姿）は固定の見出しをテンプレート側が持ち、`goalHeading` だけ YAML で変えられる。
- `#issue` などのセクション id へサイト内からリンクしている箇所はない（目次だけが使う）。
- `city-hall.yaml` に未コミットの文言修正がある。移行にそのまま含める。
- Astro 7 の `glob` ローダーは `.md` を読み、`render()` で `<Content />` と見出し一覧（`headings`）を返す。見出しには本文から生成した id が付く。
- Astro 7 の Markdown 処理系は Sätteri（Rust 製）で、`markdown.rehypePlugins` は `@astrojs/markdown-remark` を別途入れないと効かない。Sätteri 自身に `hastPlugins`（hast を扱うプラグイン）の仕組みがあり、`@astrojs/markdown-satteri` は astro に同梱されている。

## 方針

- 1 ページ = `src/content/policies/<id>.md`。frontmatter には一覧・トップ・資料集が使う項目だけ残し、4 セクションは本文に Markdown で書く。
- 見た目は「どのセクションか」ではなく「本文の構造」で決める。ファイルごとに `{#goal}` のような印を書かせない。
- 新しい依存は増やさない。セクションを `<section>` で包む処理は、Sätteri の `hastPlugins` に渡す自前の小さなプラグインで行う。
- YAML は削除し、README の該当箇所を書き換える。

## frontmatter（`src/content.config.ts` のスキーマ）

| 項目 | 内容 |
|---|---|
| `order` | 表示順（数値） |
| `badge` | ラベル。トップのカード見出し、資料集の絞り込みチップ、パンくず |
| `plain` | トップのカードの一文 |
| `title` | 一覧カードの見出し、前後ページのリンク、`<title>` |
| `titleLines` | 詳細ページの見出しを改行位置で分けた配列 |
| `lead` | 詳細ページのリード文と一覧カードの説明。`lead: \|` の複数行で書く。改行は PC 表示でだけ `<br>` になる（今と同じ） |
| `policyName` | 政策名（任意） |
| `image` | `{ src, alt }` |
| `resources` | `{ title, url, note }` の配列 |

`issue / actions / checks / goalHeading / goal` はスキーマから消す。

## 本文の書き方

```md
## いま、課題と考えていること
[考え方](/vision/)で書いたとおり、……

## 提案・働きかけたいこと
1. **仕事の実態を把握する**
   サービス残業を含む……
2. **日々の仕事を改善する**
   業務の進め方や……

## まず確かめたいこと
- サービス残業を含む労働時間と、業務ごとの作業量
- ……

## 目指す市役所の姿
職員が日々の処理に……
```

約束ごと:

- `##` が目次の項目になる。見出しの文言は自由。
- 「目指す姿」は本文の最後のセクションに置く（最後のセクションが緑の囲みになる）。
- 「提案」は `1.` の番号付き箇条書きで書き、各項目の 1 行目を太字にする。セクション直下の番号付き箇条書きはカードになり、先頭の太字がカードの見出しになる。2 行目の字下げは任意。
- `###` は普通の小見出しとして自由に使える（カードにはならない）。
- 「確かめたいこと」は `-` の箇条書き。セクション直下の箇条書きは強調リストになる（課題の中に箇条書きを書くと同じ見た目になるので、課題は段落で書く）。
- リンクは `[文言](/path/)`。生の HTML は使わない。

## 表示のしくみ

### セクション化プラグイン `src/lib/sectionize.mjs` と `src/lib/satteri-sections.mjs`

Markdown から作った HTML の並び（hast）を、見出しごとに `<section>` で包む。`sectionize.mjs` が純粋関数、`satteri-sections.mjs` がそれを Sätteri の `after` フックから呼ぶプラグイン。

- `h2` から次の `h2` の直前までを `<section>` で包む。`h3` は包まない。
- 見出しの id はそのまま残す（目次はそこへリンクする）。section には id を付けない。
- `astro.config.mjs` の `markdown.processor` に `satteri({ hastPlugins: [...] })` として登録する。Markdown を使っているのは取り組みだけなので、サイト全体への影響はない。`@astrojs/markdown-satteri` を直接 import するので `package.json` の dependencies に明記する（インストール済みで、新しく入るものはない）。
- `sectionize` は純粋関数（hast の子ノード配列を受け取って返す）として書き、`tools/sectionize.test.mjs` で `npm test` に含める。

### `src/pages/policies/[id].astro`

- `render(policy)` で `Content` と `headings` を得る。
- 目次は `headings` のうち `depth === 2` を `{ id: slug, label: text }` に直したもの。`resources` があれば末尾に `{ id: 'sources', label: '関連する資料' }` を足す（今と同じ）。
- 本文は `<article class="prose"><div class="policy-body"><Content /></div>{資料}</article>`。資料セクションは今のまま Astro 側で描く。
- ヒーロー（badge / titleLines / lead / policyName / image）、前後ページ、CTA は変えない。

### 見た目（`src/styles/components/_prose.scss`）

既存のクラス `.action-list` `.check-list` `.goal` は考え方ページやミニアプリでも使っているので残し、同じルールに構造ベースのセレクタを追加する。`:where()` で包んで旧クラスと同じ詳細度にそろえ、`.prose section` などの既存ルールとの優先順位を変えない。

| 今 | これから |
|---|---|
| `.action-list li`（提案カード） | `.policy-body :where(section > ol) li`。見出しは `li > strong:first-child`（ブロック表示にして `h3` と同じ大きさにする）。本文は `<p>` で包まれないので `li` に文字サイズと下余白を持たせる |
| `.check-list`（確かめたいこと） | `.policy-body :where(section > ul)` |
| `.goal`（目指す姿の囲み） | `.policy-body :where(section:last-child)` |
`_page.scss` にある取り組み向けの上書き（`.action-list` `.goal`）も同じ対応で直す。他のページ（`supporters` など）が `.step-list` を使っているので、`.step-list` は残す。

## 移行

- 使い捨てスクリプト（scratchpad、`js-yaml` で読む）で 5 本の YAML を `.md` に変換する。`lead` は `|` の複数行、`issue` の `<a href>` は Markdown リンクに直す。`actions` は `1. **title**` + 字下げした `text` に、`checks` は `-` に、`goalHeading` は最後の `##` の文言に使う。
- 変換後に YAML を削除し、`src/content.config.ts` のコメントと README（`src/content/policies/*.yaml` の説明、「取り組みを追加・編集する」）を `.md` の説明に書き換える。

## 確認

- `npm test` が通る（`sectionize` のテストを含む）。
- `npm run build` が通る。
- プレビューで取り組み 5 ページ、一覧、トップ、資料集を見て、移行前のスクリーンショットと比べる。マークアップは変わるので計算済みスタイルの一致は求めず、見た目の一致を見る。
- 目次のリンクで各セクションへ飛べること。

## やらないこと

- 見出しの文言をテンプレート側で固定すること（Markdown に書く）。
- `{#id}` のような見出し属性の構文の導入。
- 他ページ（考え方・プロフィールなど）の Markdown 化。
