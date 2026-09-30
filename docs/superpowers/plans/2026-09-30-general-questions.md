# ミニアプリ「一般質問 みんなの論点」 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 南相馬市議会の現任期の一般質問を、議員×分野のクロス表・主要トピック・答弁の方向性・絞り込み一覧で見られる静的ページ `/apps/questions/` をつくる。

**Architecture:** 既存ミニアプリ（`src/pages/apps/odaka.astro`）と同じ型。事実データは `src/data/questions*.json`、集計は純粋関数 `src/lib/questions-stats.mjs`（node:test で TDD）、表示は Astro コンポーネント、絞り込みだけ小さなクライアント JS `src/scripts/questions.js`。データは市議会だより PDF を `pdftotext` で文字にし、AI（実装担当の Claude）が読んで書き起こす。

**Tech Stack:** Astro 7（静的出力）、SCSS（`src/styles/abstracts/_tokens.scss` のトークンを自動 `@use`）、Node 22.20 の `node --test`、poppler の `pdftotext`、`curl`。

**設計書:** `docs/superpowers/specs/2026-09-30-general-questions-design.md`（必ず先に読む）

---

## 前提と約束ごと

- Node は v22.20.0（`node -v` で確認。違えば `export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH"`）。worktree で `node_modules` がなければ `npm install`。
- 文章はすべて日本語。断定を避け、事実と見方を分ける。議員の順位・評価につながる表現を書かない。
- 各 `.astro` の `<style lang="scss">` では `$green` などのトークンと `@include mobile` が `@use` なしで使える（`astro.config.mjs` で自動注入）。
- 親ページの `.prose` 配下のスタイルを当てるときは、既存コンポーネント（`src/components/ProjectCard.astro`）と同じく `:global(.prose) .xxx` を使う。
- PDF と抽出テキストは `gikai/` に置き、Git には含めない。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `src/lib/questions-stats.mjs` | 集計の純粋関数（並べ替え、クロス表、件数、濃淡段階） |
| `tools/questions-stats.test.mjs` | 上の関数のテスト |
| `src/data/questions-meta.json` | 分野・方向性の対応表、出典 URL |
| `src/data/questions-types.ts` | 型定義と対応表の型付き再公開 |
| `src/data/questions.json` | 定例会・議員・質問のデータ |
| `src/data/questions-analysis.json` | 分野ごとの主要トピック（AI 分析） |
| `tools/questions-data.test.mjs` | データ JSON の構造テスト |
| `src/components/CrossTable.astro` | 議員×分野のクロス表 |
| `src/components/DirectionBar.astro` | 方向性の積み上げ横棒 |
| `src/components/SessionBars.astro` | 定例会ごとの件数の小さな縦棒 |
| `src/components/QuestionCard.astro` | 質問1件のカード |
| `src/scripts/questions.js` | 一覧の絞り込み（4条件 AND、クロス表から設定） |
| `src/pages/apps/questions.astro` | ページ本体 |
| `src/styles/abstracts/_tokens.scss` | 方向性の色の Sass マップを追加 |
| `src/data/tools.ts` | 「まちを知る」のカードに追加 |
| `package.json` | `test` スクリプトを全テスト対象に |
| `.gitignore` | `gikai/` を追加 |
| `README.md`・`tools/README.md` | 説明を追記 |

---

### Task 1: 集計関数（TDD）

**Files:**
- Create: `src/lib/questions-stats.mjs`
- Test: `tools/questions-stats.test.mjs`
- Modify: `package.json`（`test` スクリプト）

- [ ] **Step 1: テストを書く**

`tools/questions-stats.test.mjs`:

```js
// src/lib/questions-stats.mjs（一般質問ミニアプリの集計）を確かめる。
import test from 'node:test';
import assert from 'node:assert/strict';
import { sortMembers, sortSessions, crossTab, countBy, orderQuestions, sessionCounts, shadeLevel } from '../src/lib/questions-stats.mjs';

const members = [
  { id: 'm2', name: '佐藤', kana: 'さとう' },
  { id: 'm1', name: '阿部', kana: 'あべ' },
];
const categories = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
const sessions = [
  { id: 's2', year: 2023, month: 3 },
  { id: 's1', year: 2022, month: 12 },
  { id: 's3', year: 2023, month: 6 },
];
const questions = [
  { id: 'q1', session: 's1', member: 'm1', category: 'a', direction: 'doing' },
  { id: 'q2', session: 's2', member: 'm1', category: 'a', direction: 'study' },
  { id: 'q3', session: 's2', member: 'm2', category: 'b', direction: null },
  { id: 'q4', session: 's1', member: 'm2', category: 'a', direction: 'doing' },
];

test('sortMembers: よみの五十音順。元の配列は変えない', () => {
  assert.deepEqual(sortMembers(members).map((m) => m.id), ['m1', 'm2']);
  assert.equal(members[0].id, 'm2');
});

test('sortSessions: 年・月の古い順', () => {
  assert.deepEqual(sortSessions(sessions).map((s) => s.id), ['s1', 's2', 's3']);
});

test('crossTab: 件数・行合計・列合計・総計・最大値', () => {
  const t = crossTab(questions, sortMembers(members), categories);
  assert.deepEqual(t.rows.map((r) => [r.member.id, r.counts, r.total]), [
    ['m1', [2, 0], 2],
    ['m2', [1, 1], 2],
  ]);
  assert.deepEqual(t.colTotals, [3, 1]);
  assert.equal(t.total, 4);
  assert.equal(t.max, 2);
});

test('crossTab: 質問がなければ最大値は 0', () => {
  assert.equal(crossTab([], members, categories).max, 0);
});

test('countBy: 指定した id の順に数え、null は数えない', () => {
  assert.deepEqual(countBy(questions, 'direction', ['study', 'doing', 'no']), [
    { id: 'study', count: 1 },
    { id: 'doing', count: 2 },
    { id: 'no', count: 0 },
  ]);
});

test('orderQuestions: 定例会の新しい順、同じ定例会は元の順', () => {
  assert.deepEqual(orderQuestions(questions, sessions).map((q) => q.id), ['q2', 'q3', 'q1', 'q4']);
});

test('sessionCounts: 定例会の並び（古い順）に、その分野の件数', () => {
  assert.deepEqual(sessionCounts(questions, sortSessions(sessions), 'a'), [2, 1, 0]);
});

test('shadeLevel: 0件は0、最大値は最上段、途中は切り上げ', () => {
  assert.equal(shadeLevel(0, 10, 5), 0);
  assert.equal(shadeLevel(10, 10, 5), 4);
  assert.equal(shadeLevel(1, 10, 5), 1);
  assert.equal(shadeLevel(6, 10, 5), 3);
  assert.equal(shadeLevel(0, 0, 5), 0);
});
```

- [ ] **Step 2: `package.json` の `test` を全テスト対象にする**

```json
    "test": "node --test tools/*.test.mjs"
```

- [ ] **Step 3: 失敗を確かめる**

Run: `npm test`
Expected: FAIL（`Cannot find module .../src/lib/questions-stats.mjs`）。既存の odaka テストは PASS のまま。

- [ ] **Step 4: 実装する**

`src/lib/questions-stats.mjs`:

```js
// ミニアプリ「一般質問 みんなの論点」の集計。ページ（ビルド時）とテストの両方から使う純粋な関数。

/** 議員をよみの五十音順に並べる（元の配列は変えない） */
export const sortMembers = (members) => [...members].sort((a, b) => a.kana.localeCompare(b.kana, 'ja'));

/** 定例会を年・月の古い順に並べる */
export const sortSessions = (sessions) => [...sessions].sort((a, b) => a.year - b.year || a.month - b.month);

/** 議員×分野の件数表。rows は members の順、counts は categories の順 */
export function crossTab(questions, members, categories) {
  const cells = new Map();
  for (const q of questions) {
    const key = `${q.member}|${q.category}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }
  const rows = members.map((member) => {
    const counts = categories.map((c) => cells.get(`${member.id}|${c.id}`) ?? 0);
    return { member, counts, total: counts.reduce((a, b) => a + b, 0) };
  });
  const colTotals = categories.map((_, i) => rows.reduce((sum, r) => sum + r.counts[i], 0));
  const total = colTotals.reduce((a, b) => a + b, 0);
  const max = Math.max(0, ...rows.flatMap((r) => r.counts));
  return { rows, colTotals, total, max };
}

/** questions[key] の値ごとの件数を ids の順で返す。ids にない値（null を含む）は数えない */
export const countBy = (questions, key, ids) =>
  ids.map((id) => ({ id, count: questions.filter((q) => q[key] === id).length }));

/** 一覧の並び：定例会の新しい順、同じ定例会の中は元の（掲載）順 */
export function orderQuestions(questions, sessions) {
  const rank = new Map(sortSessions(sessions).map((s, i) => [s.id, i]));
  return questions
    .map((q, i) => ({ q, i }))
    .sort((a, b) => rank.get(b.q.session) - rank.get(a.q.session) || a.i - b.i)
    .map(({ q }) => q);
}

/** sessions の順に、その分野の件数を返す */
export const sessionCounts = (questions, sessions, categoryId) =>
  sessions.map((s) => questions.filter((q) => q.session === s.id && q.category === categoryId).length);

/** クロス表の濃淡段階（0〜levels-1）。0件は0、1件以上は1以上 */
export const shadeLevel = (count, max, levels) =>
  count <= 0 || max <= 0 ? 0 : Math.max(1, Math.ceil((count / max) * (levels - 1)));
```

- [ ] **Step 5: 通ることを確かめる**

Run: `npm test`
Expected: PASS（新しい 8 件と既存の odaka テストすべて）

- [ ] **Step 6: Commit**

```bash
git add src/lib/questions-stats.mjs tools/questions-stats.test.mjs package.json
git commit -m "feat: 一般質問ミニアプリの集計関数を追加する"
```

---

### Task 2: 対応表・型・空データと構造テスト

**Files:**
- Create: `src/data/questions-meta.json`, `src/data/questions-types.ts`, `src/data/questions.json`, `src/data/questions-analysis.json`
- Test: `tools/questions-data.test.mjs`

- [ ] **Step 1: 対応表を書く**

`src/data/questions-meta.json`:

```json
{
  "categories": [
    { "id": "childcare", "label": "子育て・教育" },
    { "id": "welfare", "label": "福祉・医療・健康" },
    { "id": "industry", "label": "産業・雇用・農林水産" },
    { "id": "recovery", "label": "震災復興・原子力災害" },
    { "id": "disaster", "label": "防災・消防・安全" },
    { "id": "town", "label": "まちづくり・交通・公共施設" },
    { "id": "environment", "label": "環境・エネルギー" },
    { "id": "community", "label": "地域・市民活動・文化・スポーツ" },
    { "id": "admin", "label": "行財政・市役所運営" },
    { "id": "other", "label": "その他" }
  ],
  "directions": [
    { "id": "doing", "label": "実施・実施予定", "hint": "「実施する」「○年度から行う」「すでに行っている」" },
    { "id": "positive", "label": "前向きに検討", "hint": "「前向きに検討する」「実施に向けて検討する」" },
    { "id": "study", "label": "研究・状況を見て判断", "hint": "「研究する」「国の動向を注視する」「今後判断する」" },
    { "id": "status", "label": "現状説明のみ", "hint": "事実や現状の説明で、方向を示していない" },
    { "id": "no", "label": "実施しない", "hint": "「考えていない」「困難」「予定はない」" }
  ],
  "sources": {
    "dayori": { "title": "南相馬市議会「市議会だより」", "url": "https://www.city.minamisoma.lg.jp/portal/admin/shigikai/3/index.html" },
    "kaigiroku": { "title": "南相馬市議会 会議録検索システム", "url": "https://ssp.kaigiroku.net/tenant/minamisoma/pg/index.html" },
    "subjects": { "title": "南相馬市議会 議事係（一般質問件名表）", "url": "https://www.city.minamisoma.lg.jp/portal/sections/70/7010/70102/index.html" }
  }
}
```

- [ ] **Step 2: 型を書く**

`src/data/questions-types.ts`:

```ts
// ミニアプリ「一般質問 みんなの論点」の JSON の型。questions.json / questions-analysis.json / questions-meta.json に対応する。
import meta from './questions-meta.json';

export type CategoryId = 'childcare' | 'welfare' | 'industry' | 'recovery' | 'disaster' | 'town' | 'environment' | 'community' | 'admin' | 'other';
export type DirectionId = 'doing' | 'positive' | 'study' | 'status' | 'no';

export interface Category { id: CategoryId; label: string }
export interface Direction { id: DirectionId; label: string; hint: string }
export interface Source { title: string; url: string }

export interface Session {
  id: string;
  name: string;
  year: number;
  month: number;
  issue: { vol: number; date: string; url: string; pdf: string };
  /** 未収録の理由。あれば一覧・集計に含めない */
  note?: string;
}

export interface Member { id: string; name: string; kana: string; note?: string }

export interface Question {
  id: string;
  session: string;
  member: string;
  category: CategoryId;
  title: string;
  question: string;
  answer: string;
  direction: DirectionId | null;
  reason: string;
  page?: number;
}

export interface Topic { category: CategoryId; points: { text: string; questionIds: string[] }[] }

export interface CrossTab {
  rows: { member: Member; counts: number[]; total: number }[];
  colTotals: number[];
  total: number;
  max: number;
}

export const CATEGORIES = meta.categories as Category[];
export const DIRECTIONS = meta.directions as Direction[];
export const SOURCES = meta.sources as Record<'dayori' | 'kaigiroku' | 'subjects', Source>;
```

- [ ] **Step 3: 空のデータを置く**

`src/data/questions.json`:

```json
{
  "note": "市議会だよりに載った一般質問の要約をもとに書き起こした。分野・方向性はAIによる分類。",
  "sessions": [],
  "members": [],
  "questions": []
}
```

`src/data/questions-analysis.json`:

```json
{
  "generatedAt": null,
  "topics": []
}
```

- [ ] **Step 4: 構造テストを書く**

`tools/questions-data.test.mjs`:

```js
// src/data/questions*.json（ミニアプリ「一般質問 みんなの論点」）の構造を確かめる。中身（事実）の正しさは見ない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
const meta = read('questions-meta.json');
const data = read('questions.json');
const analysis = read('questions-analysis.json');

const CATEGORY_IDS = meta.categories.map((c) => c.id);
const DIRECTION_IDS = meta.directions.map((d) => d.id);
const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const unique = (arr, label) => assert.equal(new Set(arr).size, arr.length, `${label} の id が重複している`);

const sessionIds = new Set(data.sessions.map((s) => s.id));
const memberIds = new Set(data.members.map((m) => m.id));
const questionIds = new Set(data.questions.map((q) => q.id));

test('対応表: id が一意で表示名がある', () => {
  unique(CATEGORY_IDS, '分野');
  unique(DIRECTION_IDS, '方向性');
  for (const c of [...meta.categories, ...meta.directions]) assert.ok(nonEmpty(c.label), `${c.id}: label が空`);
  for (const [k, s] of Object.entries(meta.sources)) assert.ok(isUrl(s.url) && nonEmpty(s.title), `sources.${k} が不正`);
});

test('定例会: id が一意で、号の情報がそろっている', () => {
  unique(data.sessions.map((s) => s.id), '定例会');
  for (const s of data.sessions) {
    const label = `定例会 ${s.id}`;
    assert.match(s.id, /^r\d+-(0[1-9]|1[0-2])$/, `${label}: id は r<令和年>-<月2桁>`);
    assert.ok(nonEmpty(s.name), `${label}: name が空`);
    assert.ok(Number.isInteger(s.year) && Number.isInteger(s.month) && s.month >= 1 && s.month <= 12, `${label}: 年月が不正`);
    assert.ok(Number.isInteger(s.issue?.vol), `${label}: issue.vol が整数でない`);
    assert.match(s.issue.date, /^\d{4}-\d{2}-\d{2}$/, `${label}: issue.date は YYYY-MM-DD`);
    assert.ok(isUrl(s.issue.url) && isUrl(s.issue.pdf), `${label}: issue の url / pdf が不正`);
    const count = data.questions.filter((q) => q.session === s.id).length;
    if (s.note === undefined) assert.ok(count > 0, `${label}: 質問が1件もないなら note（未収録の理由）が要る`);
    else assert.ok(nonEmpty(s.note) && count === 0, `${label}: 未収録（note あり）なのに質問がある`);
  }
});

test('議員: id が一意で、よみがあり、1件以上質問している', () => {
  unique(data.members.map((m) => m.id), '議員');
  for (const m of data.members) {
    assert.ok(nonEmpty(m.name) && nonEmpty(m.kana), `議員 ${m.id}: name / kana が空`);
    assert.match(m.kana, /^[ぁ-ゖー\s]+$/, `議員 ${m.id}: kana はひらがな`);
    assert.ok(data.questions.some((q) => q.member === m.id), `議員 ${m.id}: 質問がない（一覧から外す）`);
  }
});

test('質問: 参照先と値が正しい', () => {
  unique(data.questions.map((q) => q.id), '質問');
  for (const q of data.questions) {
    const label = `質問 ${q.id}「${q.title}」`;
    assert.ok(sessionIds.has(q.session), `${label}: session ${q.session} がない`);
    assert.ok(q.id.startsWith(`${q.session}-`), `${label}: id は <session>-<番号>`);
    assert.ok(memberIds.has(q.member), `${label}: member ${q.member} がない`);
    assert.ok(CATEGORY_IDS.includes(q.category), `${label}: category が不正 (${q.category})`);
    assert.ok(q.direction === null || DIRECTION_IDS.includes(q.direction), `${label}: direction が不正 (${q.direction})`);
    assert.ok(nonEmpty(q.title) && nonEmpty(q.question), `${label}: title / question が空`);
    assert.equal(typeof q.answer, 'string', `${label}: answer は文字列（なければ空文字）`);
    assert.equal(typeof q.reason, 'string', `${label}: reason は文字列（なければ空文字）`);
    if (q.direction !== null) assert.ok(nonEmpty(q.answer) && nonEmpty(q.reason), `${label}: 方向性があるのに answer / reason が空`);
    if (q.page !== undefined) assert.ok(Number.isInteger(q.page) && q.page > 0, `${label}: page は正の整数`);
    for (const text of [q.question, q.answer, q.reason]) assert.ok(!/https?:\/\//.test(text), `${label}: 要約に URL を書かない`);
  }
});

test('質問: 同じ定例会の中では id の番号が掲載順に並ぶ', () => {
  for (const s of data.sessions) {
    const nums = data.questions.filter((q) => q.session === s.id).map((q) => Number(q.id.slice(s.id.length + 1)));
    assert.deepEqual(nums, [...nums].sort((a, b) => a - b), `定例会 ${s.id}: id の番号が昇順でない`);
  }
});

test('分析: 分野と質問 id が存在する', () => {
  assert.ok(Array.isArray(analysis.topics), 'topics が配列でない');
  if (analysis.topics.length > 0) assert.match(analysis.generatedAt, /^\d{4}-\d{2}-\d{2}$/, 'generatedAt は YYYY-MM-DD');
  unique(analysis.topics.map((t) => t.category), '分析の分野');
  for (const t of analysis.topics) {
    assert.ok(CATEGORY_IDS.includes(t.category), `分析: category が不正 (${t.category})`);
    assert.ok(t.points.length >= 1 && t.points.length <= 4, `分析 ${t.category}: 論点は1〜4項目`);
    for (const p of t.points) {
      assert.ok(nonEmpty(p.text), `分析 ${t.category}: text が空`);
      assert.ok(p.questionIds.length > 0, `分析 ${t.category}: questionIds が空`);
      for (const id of p.questionIds) {
        assert.ok(questionIds.has(id), `分析 ${t.category}: 質問 ${id} がない`);
        assert.equal(data.questions.find((q) => q.id === id).category, t.category, `分析 ${t.category}: 質問 ${id} の分野が違う`);
      }
    }
  }
});
```

- [ ] **Step 5: テストを実行する**

Run: `npm test`
Expected: PASS（空データでも全テストが通る）

- [ ] **Step 6: 1件だけ壊してテストが検知することを確かめ、元に戻す**

`questions.json` の `questions` に `{"id":"x","session":"none","member":"m01","category":"bad","title":"t","question":"q","answer":"","direction":null,"reason":""}` を一時的に入れて `npm test` → FAIL（`session none がない`）を確認し、戻す。

- [ ] **Step 7: Commit**

```bash
git add src/data/questions-meta.json src/data/questions-types.ts src/data/questions.json src/data/questions-analysis.json tools/questions-data.test.mjs
git commit -m "feat: 一般質問ミニアプリのデータの型と構造テストを追加する"
```

---

### Task 3: PDF の取得手順と最初の1回分（令和8年6月定例会）のデータ

**Files:**
- Modify: `.gitignore`（`gikai/` を追加）
- Modify: `src/data/questions.json`

市議会だよりの号ページ（`https://www.city.minamisoma.lg.jp/portal/admin/shigikai/3/<id>.html`）:

| Vol | 発行日 | ページ id | 想定する定例会（要確認） |
|---|---|---|---|
| 68 | 2023-02-01 | 20843 | 令和4年12月 `r4-12` |
| 69 | 2023-05-01 | 22220 | 令和5年3月 `r5-03` |
| 70 | 2023-08-01 | 22980 | 令和5年6月 `r5-06` |
| 71 | 2023-11-01 | 23764 | 令和5年9月 `r5-09` |
| 72 | 2024-02-01 | 24428 | 令和5年12月 `r5-12` |
| 73 | 2024-05-01 | 25640 | 令和6年3月 `r6-03` |
| 74 | 2024-08-01 | 26222 | 令和6年6月 `r6-06` |
| 75 | 2024-11-01 | 26764 | 令和6年9月 `r6-09` |
| 76 | 2025-02-01 | 27396 | 令和6年12月 `r6-12` |
| 77 | 2025-05-01 | 28024 | 令和7年3月 `r7-03` |
| 78 | 2025-08-01 | 28912 | 令和7年6月 `r7-06` |
| 79 | 2025-11-01 | 29566 | 令和7年9月 `r7-09` |
| 80 | 2026-02-01 | 30116 | 令和7年12月 `r7-12` |
| 81 | 2026-05-01 | 31110 | 令和8年3月 `r8-03` |
| 82 | 2026-08-01 | 31753 | 令和8年6月 `r8-06` |

- [ ] **Step 1: `.gitignore` に `gikai/` を追加する**

```
gikai/
```

- [ ] **Step 2: 全号の PDF を取得して文字にする**

```bash
mkdir -p gikai
for pair in 68:20843 69:22220 70:22980 71:23764 72:24428 73:25640 74:26222 75:26764 76:27396 77:28024 78:28912 79:29566 80:30116 81:31110 82:31753; do
  vol=${pair%%:*}; id=${pair##*:}
  page="https://www.city.minamisoma.lg.jp/portal/admin/shigikai/3/${id}.html"
  curl -s "$page" | grep -o 'href="[^"]*\.pdf"' | sed 's/href="//;s/"$//' > "gikai/vol${vol}.links"
  echo "vol${vol}: $(wc -l < gikai/vol${vol}.links) pdf"
done
```

Expected: 各号 1 行以上。号が複数 PDF に分かれていれば一般質問の載っている PDF を選ぶ（`pdftotext` 後に「一般質問」を grep）。相対パスなら `https://www.city.minamisoma.lg.jp` を前に付ける。

```bash
# vol82 の例（リンクが1つの場合）
url=$(head -1 gikai/vol82.links); case "$url" in http*) ;; *) url="https://www.city.minamisoma.lg.jp$url";; esac
curl -s -o gikai/vol82.pdf "$url" && pdftotext -layout gikai/vol82.pdf gikai/vol82.txt
grep -n "一般質問\|定例会" gikai/vol82.txt | head -20
```

全号について同じことを行う。使った PDF の絶対 URL を `gikai/pdf-urls.txt` に `vol<番号> <url>` で控える。

- [ ] **Step 3: Vol.82 を読み、定例会の対応と一般質問のページを確かめる**

`gikai/vol82.txt` で「令和8年6月定例会」の記載を確認する。一般質問のページ番号は PDF 上のページ（`pdftotext -f <n> -l <n>` で1ページずつ取り出して特定する）。文字が取れないページは PDF を画像として Read ツールで読む。

- [ ] **Step 4: 議員のよみを調べる**

市議会の議員名簿ページ（市サイト「市議会」→「議員名簿」。https://www.city.minamisoma.lg.jp/portal/admin/shigikai/index.html からたどる）でふりがなを確かめる。確かめられない場合は議会だよりのふりがなを使う。

- [ ] **Step 5: `questions.json` に `r8-06` を書き起こす**

書き方の規則（全号共通。以降のタスクもこれに従う）:
- `sessions[]`: `{ "id": "r8-06", "name": "令和8年6月定例会", "year": 2026, "month": 6, "issue": { "vol": 82, "date": "2026-08-01", "url": "https://www.city.minamisoma.lg.jp/portal/admin/shigikai/3/31753.html", "pdf": "<取得した PDF の URL>" } }`
- `members[]`: 初出順に `m01`, `m02`… を振る。以後その議員は同じ id を使う。`{ "id": "m01", "name": "姓 名", "kana": "せい めい" }`（名前の表記は議会だよりのとおり）。
- `questions[]`: **議事係の一般質問件名表の1件名＝1件**、件名表の順（`gikai/kenmei/<session>.txt`）。`id` は `r8-06-01` から連番。`title` は件名表の件名どおり。議会だよりで「その他の質問」として件名だけ載っているものも含める（`direction: null`）。記事の見出し・小見出しが複数の件名にまたがるときは、それぞれの件名に対応する部分の質問と答弁を付ける。詳しい規則は `gikai/notes.md`。
  - `title`: 議会だよりの見出しどおり。
  - `question` / `answer`: それぞれ1〜3文の要約。`question` は記事があれば記事から、なければ件名表の要旨（なければ件名）から。`answer` は記事からだけ。原文をそのまま長く写さない。答弁が複数の小項目にまたがるときは、件名の中心になる小項目を要約する。
  - `category`: 設計書「分野の区分」から主分野を1つ。
  - `direction`: 設計書「方向性の区分」の目安で1つ。答弁の要約がなければ `null`、`answer` と `reason` は `""`。
  - `reason`: 「『○○』との答弁のため」の形で、判定の根拠になった言い回しを短く示す一文。
  - `page`: その件名の記事または「その他の質問」が載っている PDF のページ番号。議会だよりに載っていなければ省く。
- 迷った判定は `gikai/notes.md` に `r8-06-03: 分野 town と industry で迷い、town とした（理由）` のように残す（Task 13 で人が確かめる材料にする）。

- [ ] **Step 6: テストを実行する**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add .gitignore src/data/questions.json
git commit -m "feat: 一般質問データに令和8年6月定例会を書き起こす"
```

---

### Task 4: 方向性の色と DirectionBar

**Files:**
- Modify: `src/styles/abstracts/_tokens.scss`（末尾に追加）
- Create: `src/components/DirectionBar.astro`

- [ ] **Step 1: トークンに方向性の色を足す**

`src/styles/abstracts/_tokens.scss` の「影」の前に追加:

```scss
// 一般質問の答弁の方向性（questions-meta.json の directions の id に対応）
$direction-colors: (
  doing: $green,
  positive: $green-link,
  study: $gold,
  status: $underline,
  no: $red-text,
);
```

- [ ] **Step 2: コンポーネントを書く**

`src/components/DirectionBar.astro`:

```astro
---
// 答弁の方向性の積み上げ横棒。counts は DIRECTIONS の順。
import { DIRECTIONS } from '../data/questions-types';
interface Props { label: string; counts: { id: string; count: number }[]; legend?: boolean }
const { label, counts, legend = false } = Astro.props;
const total = counts.reduce((sum, c) => sum + c.count, 0);
const nameOf = (id: string) => DIRECTIONS.find((d) => d.id === id)?.label ?? id;
const summary = counts.filter((c) => c.count > 0).map((c) => `${nameOf(c.id)} ${c.count}件`).join('、');
---
<div class="dbar">
  <p class="dbar-label">{label}<small>{total}件</small></p>
  <div class="dbar-track" role="img" aria-label={`${label}：${summary || '0件'}`}>
    {total > 0 && counts.filter((c) => c.count > 0).map((c) => (
      <span class={`dbar-seg is-${c.id}`} style={`width:${(c.count / total) * 100}%`} title={`${nameOf(c.id)} ${c.count}件`}></span>
    ))}
  </div>
  {legend && (
    <ul class="dbar-legend">
      {counts.map((c) => <li><i class={`is-${c.id}`}></i>{nameOf(c.id)} {c.count}件</li>)}
    </ul>
  )}
</div>

<style lang="scss">
// 一般質問 みんなの論点: 方向性の積み上げ横棒

.dbar {
  margin: 0 0 12px;
}

:global(.prose) .dbar p.dbar-label {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px;

  small {
    font-weight: 400;
    color: $muted;
  }
}

.dbar-track {
  display: flex;
  height: 14px;
  border-radius: 4px;
  overflow: hidden;
  background: $gray-bg;
}

.dbar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  list-style: none;
  padding: 0;
  margin: 8px 0 0;
  font-size: 13px;

  i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    margin-right: 6px;
  }
}

@each $id, $color in $direction-colors {
  .dbar-seg.is-#{$id},
  .dbar-legend i.is-#{$id} {
    background: $color;
  }
}
</style>
```

- [ ] **Step 3: Commit**（表示の確認はページができる Task 9 で行う）

```bash
git add src/styles/abstracts/_tokens.scss src/components/DirectionBar.astro
git commit -m "feat: 答弁の方向性の積み上げ横棒コンポーネントを追加する"
```

---

### Task 5: SessionBars

**Files:**
- Create: `src/components/SessionBars.astro`

- [ ] **Step 1: コンポーネントを書く**

```astro
---
// 分野ごとの、定例会別件数の小さな縦棒。max を全分野で共通にして目盛りをそろえる。
import type { Session } from '../data/questions-types';
interface Props { sessions: Session[]; counts: number[]; max: number; label: string }
const { sessions, counts, max, label } = Astro.props;
const summary = sessions.map((s, i) => `${s.name} ${counts[i]}件`).join('、');
---
<div class="sbars" role="img" aria-label={`${label}の定例会ごとの件数：${summary}`}>
  {sessions.map((s, i) => (
    <span class="sbars-col" title={`${s.name} ${counts[i]}件`}>
      <i style={`height:${max > 0 ? (counts[i] / max) * 100 : 0}%`}></i>
    </span>
  ))}
</div>
<p class="sbars-axis"><span>{sessions[0]?.name.replace('定例会', '')}</span><span>{sessions.at(-1)?.name.replace('定例会', '')}</span></p>

<style lang="scss">
// 一般質問 みんなの論点: 定例会ごとの件数

.sbars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 36px;
  border-bottom: 1px solid $line;
}

.sbars-col {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;

  i {
    display: block;
    width: 100%;
    background: $green-link;
    border-radius: 1px 1px 0 0;
  }
}

:global(.prose) p.sbars-axis {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: $muted;
  margin: 2px 0 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SessionBars.astro
git commit -m "feat: 定例会ごとの件数の縦棒コンポーネントを追加する"
```

---

### Task 6: CrossTable

**Files:**
- Create: `src/components/CrossTable.astro`

- [ ] **Step 1: コンポーネントを書く**

```astro
---
// 議員×分野のクロス表。セル・見出しは #list へのリンクで、src/scripts/questions.js が data-q-filter の条件で一覧を絞り込む。
import type { Category, CrossTab } from '../data/questions-types';
import { shadeLevel } from '../lib/questions-stats.mjs';
interface Props { categories: Category[]; table: CrossTab }
const { categories, table } = Astro.props;
const LEVELS = 5;
const filter = (cond: Record<string, string>) => JSON.stringify(cond);
---
<div class="ct-wrap" tabindex="0" aria-label="議員×分野の件数表（横にスクロールできます）">
  <table class="ct">
    <thead>
      <tr>
        <th scope="col" class="ct-corner">議員</th>
        {categories.map((c) => <th scope="col"><a href="#list" data-q-filter={filter({ category: c.id })}>{c.label}</a></th>)}
        <th scope="col" class="ct-sum">合計</th>
      </tr>
    </thead>
    <tbody>
      {table.rows.map((r) => (
        <tr>
          <th scope="row"><a href="#list" data-q-filter={filter({ member: r.member.id })}>{r.member.name}</a></th>
          {r.counts.map((n, i) => (
            <td class={`lv-${shadeLevel(n, table.max, LEVELS)}`}>
              {n > 0
                ? <a href="#list" data-q-filter={filter({ member: r.member.id, category: categories[i].id })} aria-label={`${r.member.name}・${categories[i].label} ${n}件`}>{n}</a>
                : <span aria-label="0件">·</span>}
            </td>
          ))}
          <td class="ct-sum">{r.total}</td>
        </tr>
      ))}
    </tbody>
    <tfoot>
      <tr>
        <th scope="row">合計</th>
        {table.colTotals.map((n) => <td class="ct-sum">{n}</td>)}
        <td class="ct-sum">{table.total}</td>
      </tr>
    </tfoot>
  </table>
</div>

<style lang="scss">
// 一般質問 みんなの論点: 議員×分野のクロス表

.ct-wrap {
  overflow-x: auto;
  margin: 0 0 1.2em;
  border: 1px solid $line;
  border-radius: 6px;
  background: #fff;
}

.ct {
  border-collapse: collapse;
  font-size: 13px;
  width: 100%;

  th,
  td {
    border-bottom: 1px solid $line-soft;
    padding: 6px 8px;
    text-align: center;
    white-space: nowrap;
  }

  thead th {
    font-size: 12px;
    font-weight: 600;
    white-space: normal;
    min-width: 5.5em;
    vertical-align: bottom;
    line-height: 1.4;
  }

  // 議員名の列は横スクロールしても残す
  th[scope='row'],
  .ct-corner {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #fff;
    text-align: left;
    font-weight: 600;
  }

  a {
    color: inherit;
    text-decoration: none;
    display: block;

    &:hover,
    &:focus-visible {
      text-decoration: underline;
    }
  }

  thead a,
  th[scope='row'] a {
    color: var(--green);
  }

  .ct-sum {
    font-weight: 700;
    background: $tint;
  }

  tfoot th,
  tfoot td {
    border-bottom: 0;
    background: $tint;
  }
}

// 件数の濃淡（0 は無色、1〜4 は緑を段階的に濃く）
.lv-0 {
  color: $muted;
}

@for $i from 1 through 4 {
  .lv-#{$i} {
    background: color-mix(in srgb, $green #{$i * 18%}, #fff);
    font-weight: 600;
  }
}

.lv-3,
.lv-4 {
  color: #fff;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CrossTable.astro
git commit -m "feat: 議員×分野のクロス表コンポーネントを追加する"
```

---

### Task 7: QuestionCard

> **注記（仕上げ後）:** 最終の QuestionCard は下のコードと異なる（`page` がない質問には議会だよりへのリンクを付けない、方向性なしの注記を `questions-meta.json` の `noDirection` から取る、`positive` の色を `$direction-colors` にそろえた、など）。最終の動きは設計書（`docs/superpowers/specs/2026-09-30-general-questions-design.md`）の「エラー処理・欠損」と「データ」を参照。

**Files:**
- Create: `src/components/QuestionCard.astro`

- [ ] **Step 1: コンポーネントを書く**

```astro
---
// 一般質問1件のカード。絞り込み用に data-member / data-category / data-session / data-direction を持つ。
import type { Question, Session, Member } from '../data/questions-types';
import { CATEGORIES, DIRECTIONS, SOURCES } from '../data/questions-types';
interface Props { q: Question; session: Session; member: Member }
const { q, session, member } = Astro.props;
const category = CATEGORIES.find((c) => c.id === q.category);
const direction = DIRECTIONS.find((d) => d.id === q.direction);
const dayoriHref = q.page ? `${session.issue.pdf}#page=${q.page}` : session.issue.url;
---
<li id={`q-${q.id}`} class="q-card" data-member={member.id} data-category={q.category} data-session={session.id} data-direction={q.direction ?? 'none'}>
  <p class="q-meta">{session.name} · {member.name}</p>
  <p class="q-tags"><span class="q-cat">{category?.label}</span></p>
  <h3>{q.title}</h3>
  <dl class="q-body">
    <div><dt>質問</dt><dd>{q.question}</dd></div>
    {q.answer && <div><dt>答弁</dt><dd>{q.answer}</dd></div>}
  </dl>
  <p class="q-direction">
    {direction
      ? <><span class={`q-dir is-${direction.id}`}>{direction.label}</span><span class="q-reason">{q.reason}</span></>
      : <span class="q-dir is-none">判定なし</span>}
  </p>
  <p class="q-links">
    <a href={dayoriHref} target="_blank" rel="noopener">市議会だより Vol.{session.issue.vol}{q.page && `（${q.page}ページ）`}↗</a>
    <a href={SOURCES.kaigiroku.url} target="_blank" rel="noopener">会議録で全文を探す↗</a>
  </p>
</li>

<style lang="scss">
// 一般質問 みんなの論点: 質問カード

.q-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px 6px;
  box-shadow: $shadow-card;
  scroll-margin-top: 24px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.q-cat {
  @include pill;
}

.q-dir {
  @include pill;
  color: #fff;
  margin-right: 8px;
}

@each $id, $color in $direction-colors {
  .q-dir.is-#{$id} {
    background: $color;
  }
}

.q-dir.is-status,
.q-dir.is-none {
  color: $ink;
}

.q-dir.is-none {
  background: $gray-bg;
}

:global(.prose) .q-card {
  h3 {
    font-size: 17px;
    line-height: 1.6;
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    line-height: 1.8;
    margin: 0 0 8px;
  }

  p.q-meta {
    font-size: 13px;
    color: $muted;
    margin-bottom: 4px;
  }

  p.q-tags {
    margin-bottom: 6px;
  }

  p.q-links {
    font-size: 13px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
  }
}

.q-body {
  margin: 0 0 8px;
  display: grid;
  gap: 6px;

  div {
    display: grid;
    grid-template-columns: 3em 1fr;
    gap: 8px;
  }

  dt {
    font-size: 12px;
    font-weight: 700;
    color: $green-soft;
    padding-top: 3px;
  }

  dd {
    margin: 0;
    font-size: 14px;
    line-height: 1.8;
  }
}

.q-reason {
  font-size: 13px;
  color: $muted-dark;
}

.q-links a {
  color: var(--green);
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuestionCard.astro
git commit -m "feat: 一般質問のカードコンポーネントを追加する"
```

---

### Task 8: 絞り込みスクリプト

**Files:**
- Create: `src/scripts/questions.js`

- [ ] **Step 1: スクリプトを書く**

```js
// 一般質問の一覧：議員・分野・定例会・方向性の4条件（AND）で絞り込む。
// data-q-filter を持つリンク（クロス表・トピック）を押すと、その条件にそろえてから絞り込む。
(() => {
  const form = document.getElementById('q-filter');
  if (!form) return;
  const selects = [...form.querySelectorAll('select')];
  const cards = [...document.querySelectorAll('#q-list > li')];
  const count = document.getElementById('q-count');

  const apply = () => {
    const conds = selects.filter((s) => s.value !== 'all').map((s) => [s.name, s.value]);
    let shown = 0;
    cards.forEach((card) => {
      const match = conds.every(([key, value]) => card.dataset[key] === value);
      card.hidden = !match;
      if (match) shown += 1;
    });
    count.textContent = String(shown);
  };

  form.addEventListener('change', apply);
  // reset イベントの時点ではまだ値が戻っていないので、次のタスクで反映する
  form.addEventListener('reset', () => setTimeout(apply));

  // リンク先への移動（#list や #q-xxx）はブラウザに任せ、条件だけ設定する
  document.querySelectorAll('[data-q-filter]').forEach((link) =>
    link.addEventListener('click', () => {
      const cond = JSON.parse(link.dataset.qFilter);
      selects.forEach((s) => { s.value = cond[s.name] ?? 'all'; });
      apply();
    })
  );
})();
```

- [ ] **Step 2: Commit**

```bash
git add src/scripts/questions.js
git commit -m "feat: 一般質問の一覧を4条件で絞り込むスクリプトを追加する"
```

---

### Task 9: ページ本体

**Files:**
- Create: `src/pages/apps/questions.astro`

- [ ] **Step 1: ページを書く**

```astro
---
import Base from '../../layouts/Base.astro';
import Breadcrumb from '../../components/Breadcrumb.astro';
import Toc from '../../components/Toc.astro';
import CtaBar from '../../components/CtaBar.astro';
import CrossTable from '../../components/CrossTable.astro';
import DirectionBar from '../../components/DirectionBar.astro';
import SessionBars from '../../components/SessionBars.astro';
import QuestionCard from '../../components/QuestionCard.astro';
import { navItem } from '../../data/site';
import { CATEGORIES, DIRECTIONS, SOURCES } from '../../data/questions-types';
import type { Session, Member, Question, Topic } from '../../data/questions-types';
import data from '../../data/questions.json';
import analysis from '../../data/questions-analysis.json';
import { sortMembers, sortSessions, crossTab, countBy, orderQuestions, sessionCounts } from '../../lib/questions-stats.mjs';

const TITLE = '一般質問 みんなの論点';
const allSessions = sortSessions(data.sessions as Session[]);
const sessions = allSessions.filter((s) => !s.note);
const missing = allSessions.filter((s) => s.note);
const members = sortMembers(data.members as Member[]);
const questions = data.questions as Question[];
const topics = analysis.topics as Topic[];

const sessionById = new Map(sessions.map((s) => [s.id, s]));
const memberById = new Map(members.map((m) => [m.id, m]));
const questionById = new Map(questions.map((q) => [q.id, q]));
const DIRECTION_IDS = DIRECTIONS.map((d) => d.id);

const table = crossTab(questions, members, CATEGORIES);
const undetermined = questions.filter((q) => q.direction === null).length;
const perCategory = CATEGORIES.map((c) => ({ category: c, counts: sessionCounts(questions, sessions, c.id) }));
const sessionMax = Math.max(0, ...perCategory.flatMap((p) => p.counts));
const listed = orderQuestions(questions, sessions);
const range = sessions.length > 0 ? `${sessions[0].name}〜${sessions.at(-1)!.name}` : '';
const topicOf = (id: string) => topics.find((t) => t.category === id);

const toc = [
  { id: 'numbers', label: '数字で見る' },
  { id: 'topics', label: '主要トピック' },
  { id: 'answers', label: '答弁の方向性' },
  { id: 'list', label: '質問一覧' },
  { id: 'method', label: 'データと注意点' },
];
---
<Base title={TITLE} description="南相馬市議会の現任期の一般質問を、議員別・分野別の件数、主要トピック、答弁の方向性で一覧できる試作ページ。" current="resources">
  <Breadcrumb items={[{ label: navItem('resources').label, href: navItem('resources').href }, { label: TITLE }]} />
  <section class="page-hero wrap">
    <div class="page-hero-copy">
      <p class="page-badge">ミニアプリ · 試作版</p>
      <h1><span class="nowrap">一般質問</span><span class="nowrap">みんなの論点</span></h1>
      <p class="page-lead">市議会の一般質問で、どの分野が、どれくらい取り上げられてきたか。市の答弁はどんな方向だったか。<br class="pc" />{range}の{questions.length}件を、市議会だよりの要約から整理しました。</p>
      <p class="page-subtitle">データ：{SOURCES.dayori.title}（各質問に該当号へのリンクあり）。分野・要約・方向性はAIによる分類です。</p>
    </div>
  </section>

  <div class="page-body wrap">
    <Toc items={toc} />
    <article class="prose">
      <section id="numbers">
        <h2>数字で見る</h2>
        <ul class="q-stats">
          <li><b>{questions.length}</b><span>質問の件数</span></li>
          <li><b>{members.length}</b><span>質問した議員</span></li>
          <li><b>{sessions.length}</b><span>収録した定例会</span></li>
        </ul>
        <p>議員ごと・分野ごとの件数です。色が濃いほど件数が多いことを表します。数字や議員名・分野名を押すと、下の質問一覧をその条件で絞り込みます。議員は五十音順に並べています。件数は取り上げた回数で、質問の中身の良しあしを表すものではありません。</p>
        <CrossTable categories={CATEGORIES} table={table} />
      </section>

      <section id="topics">
        <h2>主要トピック</h2>
        <p>分野ごとに、繰り返し取り上げられた論点をAIがまとめました。棒は、その分野の定例会ごとの件数です（{sessions[0]?.name}から{sessions.at(-1)?.name}まで、左が古い順）。</p>
        {topics.length === 0 && <p class="note-small">主要トピックの分析は、全期間のデータがそろってから載せます。</p>}
        <div class="topic-grid">
          {perCategory.filter((p) => table.colTotals[CATEGORIES.indexOf(p.category)] > 0).map(({ category, counts }) => (
            <section class="topic-card">
              <h3>{category.label}<small>{table.colTotals[CATEGORIES.indexOf(category)]}件</small></h3>
              <SessionBars sessions={sessions} counts={counts} max={sessionMax} label={category.label} />
              {topicOf(category.id) && (
                <ul class="topic-points">
                  {topicOf(category.id)!.points.map((p) => (
                    <li>{p.text}<a href={`#q-${p.questionIds[0]}`} data-q-filter="{}">{p.questionIds.length}件 · 例：{questionById.get(p.questionIds[0])?.title}</a></li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </section>

      <section id="answers">
        <h2>答弁の方向性</h2>
        <p>市の答弁の結論が、次の5つのどれに近いかをAIが判定しました。判定は市議会だよりの要約だけにもとづくもので、答弁の細かな言い回しや、その後の実際の対応までは反映していません。{undetermined > 0 && `市議会だよりに答弁の要約が載っていない${undetermined}件（「その他の質問」など）は、方向性を判定していません。`}</p>
        <dl class="dir-defs">
          {DIRECTIONS.map((d) => <div><dt>{d.label}</dt><dd>{d.hint}</dd></div>)}
        </dl>
        <DirectionBar label="全体" counts={countBy(questions, 'direction', DIRECTION_IDS)} legend />
        {CATEGORIES.filter((c, i) => table.colTotals[i] > 0).map((c) => (
          <DirectionBar label={c.label} counts={countBy(questions.filter((q) => q.category === c.id), 'direction', DIRECTION_IDS)} />
        ))}
      </section>

      <section id="list">
        <h2>質問一覧</h2>
        <form id="q-filter" class="q-filter" aria-label="質問一覧の絞り込み">
          <label>議員<select name="member"><option value="all">すべて</option>{members.map((m) => <option value={m.id}>{m.name}</option>)}</select></label>
          <label>分野<select name="category"><option value="all">すべて</option>{CATEGORIES.map((c) => <option value={c.id}>{c.label}</option>)}</select></label>
          <label>定例会<select name="session"><option value="all">すべて</option>{[...sessions].reverse().map((s) => <option value={s.id}>{s.name}</option>)}</select></label>
          <label>方向性<select name="direction"><option value="all">すべて</option>{DIRECTIONS.map((d) => <option value={d.id}>{d.label}</option>)}<option value="none">判定なし</option></select></label>
          <p class="q-filter-foot"><span><b id="q-count">{listed.length}</b>件</span><button type="reset" class="chip">条件をクリア</button></p>
        </form>
        <ol id="q-list" class="q-list">
          {listed.map((q) => <QuestionCard q={q} session={sessionById.get(q.session)!} member={memberById.get(q.member)!} />)}
        </ol>
      </section>

      <section id="method">
        <h2>データと注意点</h2>
        <p>{range}の定例会で行われた一般質問を、各号の市議会だよりに載った要約から書き起こしています。質問と答弁の文章は要約をさらに短くしたもので、原文ではありません。正確な内容は、各質問のリンクから市議会だよりの原文、または会議録で確かめてください。</p>
        <ol class="action-list">
          <li><h3>分野と方向性はAIによる分類</h3><p>分野は1件につき主な分野を1つだけ選んでいます。複数の分野にまたがる質問もあるため、件数は目安です。方向性は、議会だよりに載った答弁の要約から判定しており、同じ答弁でも読み方によって判定が分かれることがあると考えています。</p></li>
          <li><h3>件数は取り上げた回数</h3><p>このページの件数は、市議会の一般質問件名表の件名ごとに1件と数えたものです。市議会だよりで「その他の質問」として件名だけが載っているものも含みます。質問の深さや成果を表すものではありません。一般質問を行った議員だけを載せています。</p></li>
          {missing.length > 0 && <li><h3>未収録の定例会</h3><p>{missing.map((s) => `${s.name}（${s.note}）`).join('、')}</p></li>}
          <li><h3>誤りを見つけたら</h3><p>このページの内容はすべて JSON ファイルに置いています。誤りがあれば<button type="button" class="link-button" data-open="contact">お問い合わせ</button>からお知らせください。</p></li>
        </ol>
        <h3>出典</h3>
        <ul class="source-list">
          {Object.values(SOURCES).map((s) => <li><a href={s.url} target="_blank" rel="noopener">{s.title}↗</a></li>)}
        </ul>
      </section>
    </article>
  </div>
  <CtaBar />
</Base>

<script src="../../scripts/questions.js"></script>

<style lang="scss">
// ミニアプリ：一般質問 みんなの論点（表・棒・カードは components/ 側）

.q-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 0 0 1.4em;

  li {
    background: $tint;
    border: 1px solid $line;
    border-radius: 8px;
    padding: 14px 16px;
    display: grid;
    gap: 2px;
  }

  b {
    font-size: 28px;
    color: var(--green);
    line-height: 1.2;
  }

  span {
    font-size: 13px;
    color: $muted;
  }
}

.topic-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin: 0 0 1.2em;

  @include mobile {
    grid-template-columns: 1fr;
  }
}

.topic-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 18px 10px;
  box-shadow: $shadow-card;
  min-width: 0;

  h3 {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 16px;
    margin: 0 0 8px;

    small {
      font-size: 13px;
      font-weight: 400;
      color: $muted;
    }
  }
}

.topic-points {
  margin: 10px 0 0;
  padding-left: 1.2em;
  font-size: 14px;
  line-height: 1.8;

  li {
    margin-bottom: 6px;
  }

  a {
    display: block;
    font-size: 12px;
    color: var(--green);
  }
}

.dir-defs {
  display: grid;
  gap: 4px;
  margin: 0 0 1em;
  font-size: 13px;

  div {
    display: grid;
    grid-template-columns: 11em 1fr;
    gap: 8px;

    @include mobile {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }

  dt {
    font-weight: 700;
  }

  dd {
    margin: 0;
    color: $muted-dark;
  }
}

.q-filter {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 0 0 16px;
  padding: 14px;
  background: $tint;
  border-radius: 8px;

  @include mobile {
    grid-template-columns: 1fr 1fr;
  }

  label {
    display: grid;
    gap: 4px;
    font-size: 12px;
    font-weight: 600;
    color: $green-soft;
  }

  select {
    font: inherit;
    font-size: 14px;
    font-weight: 400;
    color: $ink;
    padding: 6px 8px;
    border: 1px solid $line;
    border-radius: 6px;
    background: #fff;
    min-width: 0;
  }
}

:global(.prose) p.q-filter-foot {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  font-size: 14px;

  b {
    font-size: 18px;
    color: var(--green);
    margin-right: 2px;
  }
}

.q-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.4em;
  display: grid;
  gap: 12px;
}

.link-button {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: var(--green);
  text-decoration: underline;
  cursor: pointer;
}
</style>
```

- [ ] **Step 2: ビルドする**

Run: `npm run build`
Expected: エラーなしで完了し、`dist/apps/questions/index.html` ができる。

- [ ] **Step 3: ブラウザで確かめる**

`.claude/launch.json` に dev サーバー（`npm run dev`、port 4321）がなければ追加し、preview_start で `/apps/questions/` を開く。確かめること:
- クロス表の総計＝数字タイルの件数＝一覧の件数。
- セルを押すと、その議員×分野に絞り込まれ、件数表示がセルの数字と一致する。行見出し・列見出しでも同様。
- 4つのセレクトの組み合わせと「条件をクリア」が動く。
- コンソールにエラーがない。
- `resize_window` の mobile で、クロス表が横スクロールし議員名の列が残る。ページ全体は横にはみ出さない。
- `.prose` の既定スタイル（見出し・リスト）がカードの中で崩れていないか。崩れていれば各コンポーネントの `:global(.prose)` 側で打ち消す。

- [ ] **Step 4: Commit**

```bash
git add src/pages/apps/questions.astro .claude/launch.json
git commit -m "feat: ミニアプリ「一般質問 みんなの論点」のページを追加する"
```

（`.claude/` は `.gitignore` 対象なので、launch.json が add できなければページだけコミットする）

---

### Task 10: 「まちを知る」への追加と README

**Files:**
- Modify: `src/data/tools.ts`（`odaka` の後、`sources` の前）
- Modify: `README.md`, `tools/README.md`

- [ ] **Step 1: カードを追加する**

`src/data/tools.ts` の `odaka` 要素の直後に:

```ts
  {
    id: 'questions',
    art: 'bars',
    badge: '試作版',
    title: '一般質問 みんなの論点',
    description: '市議会の一般質問を、議員ごと・分野ごとの件数、繰り返し取り上げられた論点、市の答弁の方向性で一覧できます。各質問から市議会だよりの原文へたどれます。',
    meta: ['データ：南相馬市議会「市議会だより」（現任期の定例会）', '分野・要約・方向性はAIによる分類'],
    href: '/apps/questions/',
    cta: '試作版を見る',
  },
```

- [ ] **Step 2: README に追記する**

`README.md` の「ファイル」の `odaka.astro` の行の後に:

```md
- `src/pages/apps/questions.astro`: ミニアプリ「一般質問 みんなの論点」。データは `src/data/questions.json`（定例会・議員・質問）と `src/data/questions-analysis.json`（分野ごとの主要トピック）、分野・方向性の対応表は `src/data/questions-meta.json`、集計は `src/lib/questions-stats.mjs`。**中身を直すときは JSON だけ編集**し、`npm test` で構造を確かめる。市議会だよりの PDF は `gikai/`（Git 対象外）に置いて読む
```

「試作段階の項目」の段落のミニアプリ列挙に「「一般質問 みんなの論点」（市議会だよりの要約から書き起こし、分野・方向性はAIによる分類）」を加える。

`tools/README.md` の末尾に:

```md
## questions-data.test.mjs / questions-stats.test.mjs

`questions-data.test.mjs` は `src/data/questions.json`・`questions-analysis.json`・`questions-meta.json`（ミニアプリ「一般質問 みんなの論点」）の構造を確かめます。id の一意性と参照先、分野・方向性の値、方向性があるときの答弁・判定理由の有無、未収録の定例会の `note`、要約に URL を書かないこと、分析の質問 id と分野の一致を見ます。中身の事実関係は見ません。

`questions-stats.test.mjs` は集計関数 `src/lib/questions-stats.mjs` を確かめます。
```

- [ ] **Step 3: ビルドと表示確認**

Run: `npm run build` → 成功。`/resources/` にカードが並ぶことをブラウザで確かめる。

- [ ] **Step 4: Commit**

```bash
git add src/data/tools.ts README.md tools/README.md
git commit -m "feat: 「まちを知る」に一般質問ミニアプリを追加する"
```

---

### Task 11: 残りの定例会の書き起こし（年ごとに分けて4回）

**Files:**
- Modify: `src/data/questions.json`

Task 3 の Step 3〜5 の手順と書き方の規則で、次の4つのまとまりを順に書き起こす。まとまりごとに `npm test` を通してコミットする。

- [ ] **Step 1: 令和4年12月・令和5年（Vol.68〜72: `r4-12`, `r5-03`, `r5-06`, `r5-09`, `r5-12`）**
  - Vol.68 が令和4年12月定例会を扱い、その定例会が新しい任期で開かれたことを本文で確かめる。違えば対応表を直し、設計書の収録範囲も直す。
  - `npm test` → PASS
  - `git commit -am "feat: 一般質問データに令和4年12月〜令和5年12月定例会を書き起こす"`
- [ ] **Step 2: 令和6年（Vol.73〜76: `r6-03`, `r6-06`, `r6-09`, `r6-12`）**
  - `npm test` → PASS
  - `git commit -am "feat: 一般質問データに令和6年の定例会を書き起こす"`
- [ ] **Step 3: 令和7年（Vol.77〜80: `r7-03`, `r7-06`, `r7-09`, `r7-12`）**
  - `npm test` → PASS
  - `git commit -am "feat: 一般質問データに令和7年の定例会を書き起こす"`
- [ ] **Step 4: 令和8年3月（Vol.81: `r8-03`）**
  - `npm test` → PASS
  - `git commit -am "feat: 一般質問データに令和8年3月定例会を書き起こす"`
- [ ] **Step 5: 件名表との突き合わせ**

`SOURCES.subjects` の議事係ページから各定例会の一般質問件名表（PDF）を取れる範囲で取り、`pdftotext` で文字にして、議員ごとの件名数を `questions.json` と比べる。

```bash
node -e '
const d=require("./src/data/questions.json");
for (const s of d.sessions){const c={};for(const q of d.questions.filter(q=>q.session===s.id)){const m=d.members.find(m=>m.id===q.member).name;c[m]=(c[m]||0)+1}console.log(s.id,JSON.stringify(c))}'
```

食い違いは議会だよりを読み直して直し、直せないものは `gikai/notes.md` に残す。直したら `npm test` → PASS、`git commit -am "fix: 一般質問データを件名表と突き合わせて直す"`。

- [ ] **Step 6: 分野と方向性の見直し**

全件がそろった状態で、分野ごとに質問を並べて読み、判定のぶれ（同じような答弁が別の方向性になっているなど）をそろえる。「その他」が全体の1割を超えたら、設計書の方針どおり区分の見直しをユーザーに相談する（勝手に区分を変えない）。直したら `npm test` → PASS、コミット。

---

### Task 12: 主要トピックの分析

**Files:**
- Modify: `src/data/questions-analysis.json`

- [ ] **Step 1: 分野ごとに論点をまとめる**

件数が1件以上の分野それぞれについて、質問の件名と要約を読み、繰り返し取り上げられた論点を2〜4項目にまとめる（1〜2件しかない分野は1項目でよい）。
- `text`: 1文。「○○について、△△を求める質問が続いている」のように、何が問われたかを書く。議員名や評価は書かない。
- `questionIds`: その論点に当たる質問の id。定例会の新しい順に並べる（先頭が代表としてリンクされる）。
- `generatedAt`: 作業した日付（YYYY-MM-DD）。

- [ ] **Step 2: テスト・ビルド・表示確認**

Run: `npm test` → PASS、`npm run build` → 成功。ブラウザで主要トピックのリンクを押すと、絞り込みが解除されて該当カードへ移動することを確かめる。

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: 一般質問の主要トピックの分析を追加する"
```

---

### Task 13: 仕上げの確認

- [ ] **Step 1: 全体の検証**

- `npm test` → PASS、`npm run build` → 成功。
- ブラウザで Task 9 Step 3 の確認を、全データで繰り返す。スクリーンショットを撮る。
- 無作為に10件を選び、市議会だよりのリンクが該当ページを開くことを確かめる。

- [ ] **Step 2: 人の確認を依頼する**

無作為に選んだ10件と、`gikai/notes.md` の迷った判定を一覧にしてユーザー（森山）に示し、要約と判定を原文と見比べてもらう。指摘を反映して `npm test` → PASS、コミット。

- [ ] **Step 3: 仕上げ**

superpowers:finishing-a-development-branch に従って統合方法（PR など）を決める。
