# 取り組みページを frontmatter 付き Markdown にする 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/content/policies/*.yaml` を、frontmatter 付きの `*.md`（本文は Markdown）に置き換え、見た目を変えずに編集しやすくする。

**Architecture:** 一覧・トップ・資料集が使う項目は frontmatter に残し、詳細ページの 4 セクションは Markdown 本文に書く。Astro 7 の Markdown 処理系 Sätteri の `hastPlugins` に自前の小さなプラグインを足し、`##` ごとに `<section>` で包む。見た目は構造（番号付きリスト・箇条書き・最後のセクション）で当てる。

**Tech Stack:** Astro 7.3（Markdown は `@astrojs/markdown-satteri` 0.4 / `satteri` 0.10、どちらも astro が同梱）、SCSS、`node --test`。ビルドは nodebrew の Node v22.20.0。

設計書: `docs/superpowers/specs/2026-10-06-policies-markdown-design.md`

---

## 前提

- ビルド・テストは Node v22.20.0 で実行する。`which node` が `~/.nodebrew/current/bin/node` なら PATH はそのままでよい。違えば `export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH"` を先に通す。
- Astro 7 は Markdown の既定処理系が Sätteri（Rust 製）で、`markdown.rehypePlugins` は `@astrojs/markdown-remark` を別途入れないと効かない。この計画では rehype は使わず、Sätteri の `hastPlugins` を使う（新しい依存は増えない。`@astrojs/markdown-satteri` は `node_modules` に既にある）。
- Sätteri の hast プラグインは `{ name, after(root, ctx) }` の形で `after` が文書ごとに 1 回呼ばれ、`ctx.replaceNode(root, { type: 'root', children })` で木全体を差し替えられる。`root.children` にはブロック要素の間に `"\n"` のテキストノードが混じる。見出しの `id` は Astro 側のプラグインが利用者プラグインの後に付けるので、包むだけなら影響しない（検証済み）。
- `city-hall.yaml` には未コミットの文言修正がある。変換はこの作業ツリーの内容を使う（修正はそのまま `.md` に入る）。

## ファイル一覧

- Create: `src/lib/sectionize.mjs` — hast の子ノード配列を `h2` ごとに `section` で包む純粋関数
- Create: `tools/sectionize.test.mjs` — その検査
- Create: `src/lib/satteri-sections.mjs` — Sätteri 用プラグイン（`sectionize` を `after` フックから呼ぶ）
- Modify: `astro.config.mjs` — `markdown.processor` に `satteri({ hastPlugins: [...] })` を設定
- Modify: `package.json` — `@astrojs/markdown-satteri` を `dependencies` に明記（既にインストール済み。直接 import するため）
- Modify: `src/content.config.ts` — `*.md` を読む。本文に移る項目をスキーマから外す
- Create: `src/content/policies/{children,city-hall,economy,future,odaka-kashima}.md` — 変換結果
- Delete: `src/content/policies/*.yaml`
- Modify: `src/pages/policies/[id].astro` — `render()` で本文を描画、目次は見出しから生成
- Modify: `src/styles/components/_prose.scss` — `.action-list` `.check-list` `.goal` を構造ベースのセレクタに
- Modify: `src/styles/layout/_page.scss:149-166` — 同上の上書き
- Modify: `README.md:46,58` — `.md` の説明に

---

### Task 0: 変更前のスクリーンショットを撮る

**Files:** なし（scratchpad に画像を残す）

- [ ] **Step 1: 開発サーバーを起動する**

`.claude/launch.json` がなければ次の内容で作る。

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 4321 }
  ]
}
```

`preview_start { name: "dev" }` でブラウザペインを開く。

- [ ] **Step 2: 8 ページのスクリーンショットを撮る**

`/policies/city-hall/` `/policies/children/` `/policies/economy/` `/policies/odaka-kashima/` `/policies/future/` `/policies/` `/` `/resources/sources/` を順に `navigate` し、それぞれ `computer { action: "screenshot" }` を撮って見た目を覚えておく（ページ全体の長さ、提案カードの数字丸、確かめたいことの緑丸、目指す姿の囲み）。

あわせて、後の比較用に本文の HTML を保存する。

```bash
mkdir -p "$SCRATCH/before" && for id in city-hall children economy odaka-kashima future; do curl -s "http://localhost:4321/policies/$id/" > "$SCRATCH/before/$id.html"; done; ls "$SCRATCH/before"
```

`$SCRATCH` は scratchpad ディレクトリ（`/private/tmp/claude-501/-Users-moriyama-work-----moriyamatakashi-com/19d3811e-835c-454c-b74e-d8eb2651849b/scratchpad`）。

Expected: 5 ファイルができる。

---

### Task 1: `sectionize`（純粋関数）

**Files:**
- Create: `src/lib/sectionize.mjs`
- Test: `tools/sectionize.test.mjs`

- [ ] **Step 1: 失敗するテストを書く**

`tools/sectionize.test.mjs`:

```js
// src/lib/sectionize.mjs（取り組み本文の h2 ごとの section 化）を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionize } from '../src/lib/sectionize.mjs';

const el = (tagName, children = []) => ({ type: 'element', tagName, properties: {}, children });
const nl = () => ({ type: 'text', value: '\n' });

test('h2 から次の h2 の直前までを section で包む', () => {
  const out = sectionize([el('h2'), nl(), el('p'), nl(), el('h2'), nl(), el('ul')]);
  assert.deepEqual(out.map((n) => n.tagName), ['section', 'section']);
  assert.deepEqual(out[0].children.map((n) => n.tagName ?? n.value), ['h2', '\n', 'p', '\n']);
  assert.deepEqual(out[1].children.map((n) => n.tagName ?? n.value), ['h2', '\n', 'ul']);
});

test('最初の h2 より前のノードはそのまま残す', () => {
  const out = sectionize([el('p'), nl(), el('h2'), el('p')]);
  assert.deepEqual(out.map((n) => n.tagName ?? n.value), ['p', '\n', 'section']);
});

test('h3 は包まない（section の中にそのまま入る）', () => {
  const out = sectionize([el('h2'), el('h3'), el('p')]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].children.map((n) => n.tagName), ['h2', 'h3', 'p']);
});

test('h2 がなければ何も変えない。入力の配列は変えない', () => {
  const input = [el('p'), el('ul')];
  const out = sectionize(input);
  assert.deepEqual(out.map((n) => n.tagName), ['p', 'ul']);
  assert.equal(input.length, 2);
});

test('section の properties は空（id は見出しに残す）', () => {
  const h2 = { type: 'element', tagName: 'h2', properties: { id: 'x' }, children: [] };
  const [section] = sectionize([h2]);
  assert.deepEqual(section.properties, {});
  assert.equal(section.children[0].properties.id, 'x');
});
```

- [ ] **Step 2: テストが落ちることを確かめる**

Run: `node --test tools/sectionize.test.mjs`
Expected: `ERR_MODULE_NOT_FOUND`（`src/lib/sectionize.mjs` がない）で失敗。

- [ ] **Step 3: 実装する**

`src/lib/sectionize.mjs`:

```js
// 取り組み本文（Markdown から作った hast）を、h2 ごとに <section> で包む。
// 最初の h2 より前のノードはそのまま残す。h3 以下は包まない。
// 見出しの id は Astro 側のプラグインが後から付けるので、section 自体には id を付けない。

export function sectionize(children) {
  const out = [];
  let current = null;
  for (const node of children) {
    if (node.type === 'element' && node.tagName === 'h2') {
      current = { type: 'element', tagName: 'section', properties: {}, children: [node] };
      out.push(current);
    } else if (current) {
      current.children.push(node);
    } else {
      out.push(node);
    }
  }
  return out;
}
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `node --test tools/sectionize.test.mjs`
Expected: `# pass 5` / `# fail 0`。

- [ ] **Step 5: コミット**

```bash
git add src/lib/sectionize.mjs tools/sectionize.test.mjs
git commit -m "feat: Markdown 本文を h2 ごとに section で包む sectionize を追加"
```

---

### Task 2: Sätteri プラグインとして登録する

**Files:**
- Create: `src/lib/satteri-sections.mjs`
- Modify: `astro.config.mjs`
- Modify: `package.json`

- [ ] **Step 1: プラグインを書く**

`src/lib/satteri-sections.mjs`:

```js
// Astro 7 の Markdown 処理系 Sätteri 用プラグイン。文書全体を h2 ごとの <section> に組み直す。
// astro.config.mjs の markdown.processor に渡す。
import { sectionize } from './sectionize.mjs';

export const satteriSections = {
  name: 'sections',
  after(root, ctx) {
    ctx.replaceNode(root, { type: 'root', children: sectionize(root.children) });
  },
};
```

- [ ] **Step 2: `astro.config.mjs` に登録する**

`import vercel from '@astrojs/vercel';` の下に追加:

```js
import { satteri } from '@astrojs/markdown-satteri';
import { satteriSections } from './src/lib/satteri-sections.mjs';
```

`defineConfig({ ... })` の `output: 'static',` の前に追加:

```js
  // Markdown（取り組みの本文）。h2 ごとに <section> で包み、CSS で見た目を当てられるようにする
  markdown: {
    processor: satteri({ hastPlugins: [satteriSections] }),
  },
```

- [ ] **Step 3: `package.json` に依存を明記する**

`"dependencies"` に 1 行足す（アルファベット順で `@astrojs/vercel` の前）:

```json
    "@astrojs/markdown-satteri": "^0.4.2",
```

その後 `npm install` を実行し、`package-lock.json` の差分が `packages[""].dependencies` への 1 行追加だけであることを `git diff package-lock.json` で確かめる。

- [ ] **Step 4: ビルドが通ることを確かめる**

Run: `npm run build`
Expected: `[build] Complete!`、終了コード 0。まだ Markdown のコンテンツはないので出力は変わらない。

- [ ] **Step 5: コミット**

```bash
git add src/lib/satteri-sections.mjs astro.config.mjs package.json package-lock.json
git commit -m "feat: Markdown を h2 ごとに section 化する Sätteri プラグインを登録"
```

---

### Task 3: YAML を Markdown に変換する

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/content/policies/*.md`
- Delete: `src/content/policies/*.yaml`

- [ ] **Step 1: スキーマとローダーを変える**

`src/content.config.ts` を次の内容にする:

```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 取り組み：1ページ = 1つの Markdown ファイル（src/content/policies/*.md）
// frontmatter は一覧・トップ・資料集が使う項目。詳細ページの本文（課題・提案・確かめたいこと・目指す姿）は Markdown で書く。
// 本文の書き方は README「取り組みを追加・編集する」を参照
const policies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/policies' }),
  schema: z.object({
    order: z.number(),
    badge: z.string(),
    plain: z.string(),
    title: z.string(),
    titleLines: z.array(z.string()),
    lead: z.string(),
    policyName: z.string().optional(),
    image: z.object({ src: z.string(), alt: z.string() }),
    resources: z.array(z.object({ title: z.string(), url: z.string().url(), note: z.string() })),
  }),
});

export const collections = { policies };
```

- [ ] **Step 2: 変換スクリプトを scratchpad に書く**

`$SCRATCH/convert.mjs`（`js-yaml` はプロジェクトの `node_modules` から読む）:

```js
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const root = '/Users/moriyama/work/市議選/moriyamatakashi.com';
const yaml = createRequire(join(root, 'package.json'))('js-yaml');
const dir = join(root, 'src/content/policies');

// 本文の <a href="...">text</a> を Markdown リンクにする
const toMd = (s) => s.replace(/<a href=\"([^\"]+)\">([^<]+)<\/a>/g, '[$2]($1)');

for (const file of readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
  const d = yaml.load(readFileSync(join(dir, file), 'utf8'));
  const { issue, actions, checks, goalHeading, goal, ...front } = d;
  const fm = yaml.dump(front, { lineWidth: -1, quotingType: '"', forceQuotes: false, noCompatMode: true });
  const body = [
    '## いま、課題と考えていること',
    ...issue.map(toMd),
    '',
    '## 提案・働きかけたいこと',
    ...actions.map((a, i) => `${i + 1}. **${a.title}**\n   ${toMd(a.text)}`),
    '',
    '## まず確かめたいこと',
    ...checks.map((c) => `- ${toMd(c)}`),
    '',
    `## ${goalHeading}`,
    ...goal.map(toMd),
  ].join('\n');
  writeFileSync(join(dir, basename(file, '.yaml') + '.md'), `---\n${fm}---\n\n${body}\n`);
}
```

注意: `issue` と `goal` の各段落は空行で区切る必要がある。上の `join('\n')` では段落が連続してしまうので、`...issue.map(toMd)` を `...issue.flatMap((t) => [toMd(t), ''])` に、`...goal.map(toMd)` を `...goal.flatMap((t) => [toMd(t), ''])` にしてから実行する（末尾の空行は `trimEnd()` で消す: `writeFileSync(..., \`---\n${fm}---\n\n${body.trimEnd()}\n\`)`）。

- [ ] **Step 3: 実行して結果を目で確かめる**

```bash
node "$SCRATCH/convert.mjs" && ls src/content/policies && cat src/content/policies/city-hall.md
```

確かめること:
- frontmatter の `lead` が `|-` の複数行になっている（`js-yaml` は改行を含む文字列を自動でブロックスカラーにする。`"...\n..."` のままなら `lineWidth: -1` と `quotingType` を見直す）。
- `titleLines` が `- ` の配列、`image` が `src:` / `alt:` の 2 行、`resources` が配列。
- 本文の `[考え方](/vision/)` が Markdown リンクになっている（`city-hall.md` の課題の 1 段落目）。
- 段落が空行で分かれている。提案が `1. **…**` + 字下げ本文、確かめたいことが `- `、最後が `## 目指す…`。
- 他の 4 ファイルも `head -30` で同様に確かめる。

- [ ] **Step 4: YAML を消す**

```bash
git rm -q src/content/policies/*.yaml && ls src/content/policies
```

Expected: `.md` が 5 本だけ。

- [ ] **Step 5: 同期して型が通ることを確かめる**

Run: `npx astro sync`
Expected: エラーなし。（`[id].astro` はまだ `p.issue` などを参照しているので `astro check` や build はこの時点では通らない。Task 4 で直す。）

---

### Task 4: 詳細ページを Markdown 描画に変える

**Files:**
- Modify: `src/pages/policies/[id].astro:1-26`（frontmatter）と `:39-61`（本文）

- [ ] **Step 1: frontmatter を書き換える**

`import { getCollection } from 'astro:content';` を:

```ts
import { getCollection, render } from 'astro:content';
```

`const p = policy.data;` から `const toc = [...]` までを次に置き換える:

```ts
const p = policy.data;
const { Content, headings } = await render(policy);
// 目次は本文の ## 見出しから。関連する資料は Astro 側で描くので手で足す
const toc = [
  ...headings.filter((h) => h.depth === 2).map((h) => ({ id: h.slug, label: h.text })),
  ...(p.resources.length ? [{ id: 'sources', label: '関連する資料' }] : []),
];
```

`const number = ...` の行は使われていないので消す。

- [ ] **Step 2: 本文を置き換える**

`<article class="prose">` の中、`<section id="issue">` から `</section>`（goal）までの 4 セクションを次の 3 行に置き換える。`{p.resources.length > 0 && (...)}` はそのまま残す。

```astro
      <div class="policy-body">
        <Content />
      </div>
```

- [ ] **Step 3: ビルドが通ることを確かめる**

Run: `npm run build`
Expected: `[build] Complete!`。`dist/policies/city-hall/index.html` に `<section><h2 id="` が 4 回出る:

```bash
grep -o '<section><h2 id="[^"]*"' dist/policies/city-hall/index.html
```

Expected:
```
<section><h2 id="いま課題と考えていること"
<section><h2 id="提案働きかけたいこと"
<section><h2 id="まず確かめたいこと"
<section><h2 id="目指す市役所の姿"
```

（id の文字列は Sätteri 側の slugger の結果に従う。4 本あることと、目次の `href` が同じ値であることを確かめればよい。）

- [ ] **Step 4: コミット**

```bash
git add src/content.config.ts src/content/policies src/pages/policies/[id].astro
git commit -m "feat: 取り組みを frontmatter 付き Markdown に移行"
```

（この時点では提案カードなどの見た目は崩れている。次の Task で直す。）

---

### Task 5: 見た目を構造ベースのセレクタに書き換える

**Files:**
- Modify: `src/styles/components/_prose.scss:60-125,132-172`
- Modify: `src/styles/layout/_page.scss:149-166`

- [ ] **Step 1: 他で使っていないことを確かめる**

```bash
grep -rn "action-list\|check-list\|class=\"goal\"\|step-list" src --include='*.astro' --include='*.scss'
```

実際の結果: `.action-list` `.check-list` `.goal` は `vision.astro` とミニアプリ（`apps/*.astro`）でも使っていた。そのため書き換えではなく、既存ルールに `:where()` で詳細度をそろえた構造ベースのセレクタを**追加**する形にした（Step 2・3 の内容はその方針で読み替える）。

- [ ] **Step 2: `_prose.scss` を書き換える**

`.action-list,\n.step-list {` を次にする（`.action-list` を `.policy-body section > ol` に替える）:

```scss
// 番号付きの手順・取り組みリスト
// .policy-body（取り組みの Markdown 本文）では、セクション直下の番号付きリストが提案カードになる
.policy-body section > ol,
.step-list {
```

同じブロック内の `h3 {` ルールの直前に、カード見出し（`1. **見出し**` の太字）のルールを足す:

```scss
  // Markdown では「1. **見出し**」の太字がカードの見出し
  li > strong:first-child {
    display: block;
    font-size: 17px;
    margin-bottom: 6px;
    line-height: 1.6;
  }
```

同じブロックの `p {` ルールの直後に、本文が `<p>` で包まれない分の文字サイズと下余白を足す:

```scss
  // Markdown のカードは本文が <p> で包まれないので、li 自体に文字サイズと下余白を持たせる
  .policy-body & > li {
    padding-bottom: 24px;
    font-size: 15px;
    line-height: 1.9;
  }
```

（`.policy-body & > li` は `.policy-body .policy-body section > ol > li` と `.policy-body .step-list > li` に展開される。`.step-list` は取り組みページにないので後者は実害なし。気になるなら `.policy-body section > ol > li { ... }` をブロックの外に独立して書いてもよい。）

`.goal {` を次にする:

```scss
// 目指す姿（取り組みの Markdown 本文では最後のセクション）
.policy-body > section:last-child {
```

`.check-list {` を次にする:

```scss
// 確かめたいこと（取り組みの Markdown 本文では、セクション直下の箇条書き）
.policy-body section > ul {
```

- [ ] **Step 3: `_page.scss` を書き換える**

149〜166 行目の 3 ブロックを次にする:

```scss
  .policy-body section > ol > li {
    background: $tint;
    border: 1px solid $line;
    box-shadow: none;
    border-radius: 6px;
  }

  .policy-body section > ol > li > strong:first-child {
    font-size: 16px;
  }

  .policy-body > section:last-child {
    background: $tint;
    border: 1px solid $line;
    border-radius: 6px;
  }
```

- [ ] **Step 4: ビルドして見比べる**

Run: `npm run build`（Expected: 成功）。開発サーバー（Task 0 で起動済み）で 5 つの取り組みページを開き、Task 0 のスクリーンショットと見比べる:

- 提案: 緑丸の番号付きカード、見出しが太字で 1 行目、本文がその下
- 確かめたいこと: 薄緑の囲み、各行の先頭に緑の丸
- 目指す姿: 緑のグラデーション（`_page.scss` の上書きが効くページでは `$tint`）の囲み
- 課題の `考え方` リンクが緑の太字＋下線（`.prose :is(p, li, dd) > a` が効く）
- 目次の 5 項目をクリックして各セクションへ飛ぶ

ズレがあれば `_prose.scss` の数値を直す。あわせて `/policies/` `/` `/resources/sources/` も開き、変化がないことを見る（frontmatter の項目しか使っていないので変わらないはず）。

`javascript_tool` で計算済みスタイルも確かめる:

```js
const li = document.querySelector('.policy-body section > ol > li');
const s = getComputedStyle(li);
[s.paddingLeft, s.backgroundColor, getComputedStyle(li, '::before').content, getComputedStyle(li.querySelector('strong')).display]
```

Expected: `["66px", "<緑系の rgb>", "counter(n)" または "\"1\"", "block"]`。

- [ ] **Step 5: コミット**

```bash
git add src/styles/components/_prose.scss src/styles/layout/_page.scss
git commit -m "style: 取り組み本文の提案カード・確かめたいこと・目指す姿を Markdown の構造で当てる"
```

---

### Task 6: README を直す

**Files:**
- Modify: `README.md:46,58`

- [ ] **Step 1: ファイル一覧の行を書き換える**

46 行目:

```md
- `src/content/policies/*.md`: 取り組み5つの内容（frontmatter + Markdown 本文）。**取り組みの文章・資料リンクを直すときはここだけ編集**すれば、個別ページ・一覧・トップのカード・資料集の一覧に反映されます
```

- [ ] **Step 2: 「取り組みを追加・編集する」を書き換える**

58 行目の段落を次にする:

````md
`src/content/policies/` に Markdown を1つ置くと、`/policies/<ファイル名>/` のページができます。frontmatter の項目は `src/content.config.ts` のスキーマを参照してください。`order` が表示順、`badge` がラベル、`resources` が関連する資料です。

本文は `##` の見出しで区切ります。見出しの文言は自由ですが、次の約束があります。

```md
## いま、課題と考えていること
段落。リンクは [考え方](/vision/) のように書く。

## 提案・働きかけたいこと
1. **提案の見出し**
   提案の本文。番号付きの箇条書きが提案カードになり、1行目の太字が見出しになる。

## まず確かめたいこと
- 箇条書きが「確かめたいこと」の強調リストになる。

## 目指す市役所の姿
最後のセクションが緑の囲みになる。
```

`##` の見出しは目次に出ます。`###` は普通の小見出しとして使えます。セクション直下の箇条書きは強調リストの見た目になるので、課題や目指す姿は段落で書いてください。セクション分けの処理は `src/lib/sectionize.mjs`（`npm test` で確かめる）です。
````

- [ ] **Step 3: コミット**

```bash
git add README.md
git commit -m "docs: 取り組みの Markdown の書き方を README に"
```

---

### Task 7: 最終確認

- [ ] **Step 1: テストとビルド**

```bash
npm test && npm run build
```

Expected: 全テスト pass（`sectionize` の 5 本を含む）、`[build] Complete!`。

- [ ] **Step 2: 本文の文言が落ちていないことを確かめる**

変換で文章が欠けていないか、変更前後の HTML からテキストだけ抜いて比べる:

```bash
for id in city-hall children economy odaka-kashima future; do
  curl -s "http://localhost:4321/policies/$id/" > "$SCRATCH/after-$id.html"
  node -e '
    const strip = (f) => require("fs").readFileSync(f, "utf8").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "").replace(/\s+/g, "");
    const [a, b] = process.argv.slice(1).map(strip);
    console.log(process.argv[1].split("/").pop(), a === b ? "same" : `DIFF (${a.length} vs ${b.length})`);
  ' "$SCRATCH/before/$id.html" "$SCRATCH/after-$id.html"
done
```

Expected: 5 本とも `same`。`DIFF` なら `diff <(…) <(…)` で場所を特定する（Markdown の記号が本文に残っている、段落が結合した、など）。

- [ ] **Step 3: 作業ツリーがきれいなことを確かめる**

```bash
git status --short
```

Expected: 何も出ない（`.claude/launch.json` を新規作成した場合はそれだけ。コミットするか `.gitignore` にあるかを確かめる）。
