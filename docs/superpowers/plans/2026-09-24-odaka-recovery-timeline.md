# ミニアプリ「小高 復興のあゆみ」実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 震災後の小高区の計画・調査・主要事業・数字を一つの時間軸で見られる静的ページ `/apps/odaka/` を、既存ミニアプリと同じ型で追加する。

**Architecture:** 事実データは `src/data/odaka-*.json` 3本に置き、`node --test` で構造を検証する。ページ `src/pages/apps/odaka.astro` は Base レイアウト＋目次＋prose 記事で、年表は新規 `Timeline.astro`、事業は新規 `ProjectCard.astro`、数字は既存 `MiniChart.astro` で描く。絞り込みは既存の資料集チップの仕組みを `data-target` で汎用化して使う。

**Tech Stack:** Astro 7（静的出力）、Node 22.20（`~/.nodebrew/node/v22.20.0/bin` を PATH の先頭に）、`node:test`、素の CSS／JS。

仕様: `docs/superpowers/specs/2026-09-24-odaka-recovery-timeline-design.md`

**すべてのコマンドの前提:** リポジトリ直下（このワークツリー）で、次を付けて実行する。

```bash
export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH"
```

`node --version` が `v22.20.0` でなければ PATH が通っていない。ワークツリー直後にビルドが rolldown のネイティブバインディングで落ちたら、同じ Node で `npm install` し直す。

---

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `src/data/odaka-timeline.json` | 年表の項目（計画・調査・事業・出来事） |
| `src/data/odaka-projects.json` | 主要事業と現状 |
| `src/data/odaka-numbers.json` | 数字の系列（MiniChart 用） |
| `tools/odaka-data.test.mjs` | 上記 JSON の構造検証（`node --test`） |
| `src/data/odaka-types.ts` | 年表項目・事業の TypeScript 型（コンポーネントとページで共有） |
| `src/components/Timeline.astro` | 年表の描画 |
| `src/components/ProjectCard.astro` | 事業カードの描画 |
| `src/pages/apps/odaka.astro` | ページ本体 |
| `src/scripts/site.js` | 絞り込みを複数リスト対応に |
| `src/styles/global.css` | 年表・事業カード・アプリ用アートの CSS 追記 |
| `src/pages/index.astro`, `src/pages/resources.astro` | ミニアプリ一覧にカード追加 |
| `README.md`, `tools/README.md` | ファイル説明とテストの案内 |

---

### Task 1: データ検証テストと空のデータファイル

**Files:**
- Create: `tools/odaka-data.test.mjs`
- Create: `src/data/odaka-timeline.json`
- Create: `src/data/odaka-projects.json`
- Create: `src/data/odaka-numbers.json`
- Modify: `package.json`（`scripts.test` を追加）

- [ ] **Step 1: テストを書く**

`tools/odaka-data.test.mjs`:

```js
// src/data/odaka-*.json の構造を確かめる。中身（事実）の正しさは見ない。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}`, import.meta.url), 'utf8'));
const timeline = read('odaka-timeline.json');
const projects = read('odaka-projects.json');
const numbers = read('odaka-numbers.json');

const KINDS = ['plan', 'survey', 'project', 'event'];
const STATUSES = ['done', 'building', 'planned', 'suspended'];
const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

const checkSources = (sources, label) => {
  assert.ok(Array.isArray(sources), `${label}: sources が配列でない`);
  for (const s of sources) {
    assert.ok(nonEmpty(s.title), `${label}: 出典の title が空`);
    assert.ok(isUrl(s.url), `${label}: 出典の url が不正 (${s.url})`);
  }
};

test('年表: 各項目に必要な値があり、確認済みなら出典がある', () => {
  assert.ok(Array.isArray(timeline.items));
  for (const it of timeline.items) {
    const label = `年表「${it.title}」`;
    assert.equal(typeof it.year, 'number', `${label}: year が数値でない`);
    if (it.month !== undefined) assert.ok(it.month >= 1 && it.month <= 12, `${label}: month が 1〜12 でない`);
    assert.ok(KINDS.includes(it.kind), `${label}: kind が不正 (${it.kind})`);
    assert.ok(nonEmpty(it.title), `${label}: title が空`);
    assert.ok(nonEmpty(it.summary), `${label}: summary が空`);
    assert.equal(typeof it.verified, 'boolean', `${label}: verified が真偽値でない`);
    checkSources(it.sources, label);
    if (it.verified) assert.ok(it.sources.length > 0, `${label}: 確認済みなのに出典がない`);
    else assert.ok(nonEmpty(it.note), `${label}: 未確認なのに note がない`);
  }
});

test('年表: 年月の昇順に並んでいる', () => {
  const key = (it) => it.year * 100 + (it.month ?? 0);
  for (let i = 1; i < timeline.items.length; i++) {
    assert.ok(key(timeline.items[i - 1]) <= key(timeline.items[i]), `「${timeline.items[i].title}」の順序が前後している`);
  }
});

test('年表: projectId は事業に存在する', () => {
  const ids = new Set(projects.items.map((p) => p.id));
  for (const it of timeline.items) {
    if (it.projectId !== undefined) assert.ok(ids.has(it.projectId), `年表「${it.title}」の projectId ${it.projectId} が事業にない`);
  }
});

test('事業: id は一意で、状態と出典がそろっている', () => {
  assert.ok(Array.isArray(projects.items));
  const seen = new Set();
  for (const p of projects.items) {
    const label = `事業「${p.name}」`;
    assert.ok(/^[a-z0-9-]+$/.test(p.id), `${label}: id は小文字英数字とハイフンのみ (${p.id})`);
    assert.ok(!seen.has(p.id), `${label}: id が重複`);
    seen.add(p.id);
    assert.ok(nonEmpty(p.name) && nonEmpty(p.category) && nonEmpty(p.summary), `${label}: name/category/summary が空`);
    assert.ok(STATUSES.includes(p.status), `${label}: status が不正 (${p.status})`);
    assert.equal(typeof p.start, 'number', `${label}: start が数値でない`);
    if (p.end !== undefined) assert.ok(p.end >= p.start, `${label}: end が start より前`);
    assert.equal(typeof p.verified, 'boolean', `${label}: verified が真偽値でない`);
    checkSources(p.sources, label);
    if (p.verified) assert.ok(p.sources.length > 0, `${label}: 確認済みなのに出典がない`);
    assert.ok(Array.isArray(p.current), `${label}: current が配列でない`);
    for (const c of p.current) {
      assert.ok(nonEmpty(c.label) && nonEmpty(c.value) && nonEmpty(c.asOf), `${label}: current の label/value/asOf が空`);
      assert.ok(isUrl(c.source), `${label}: current の source が不正`);
    }
    if (p.status !== 'done' && p.current.length === 0) assert.ok(nonEmpty(p.body), `${label}: 未完成で current が空なら body に状況を書く`);
  }
});

test('数字: 各系列に単位・出典・点があり、値は数値か null', () => {
  assert.ok(Array.isArray(numbers.series));
  const ids = new Set();
  for (const s of numbers.series) {
    const label = `系列「${s.title}」`;
    assert.ok(nonEmpty(s.id) && !ids.has(s.id), `${label}: id が空か重複`);
    ids.add(s.id);
    assert.ok(nonEmpty(s.title), `${label}: title が空`);
    assert.equal(typeof s.unit, 'string', `${label}: unit が文字列でない`);
    assert.ok(['bar', 'line'].includes(s.kind), `${label}: kind が bar/line でない`);
    assert.ok(nonEmpty(s.source?.title) && isUrl(s.source?.url), `${label}: source が不正`);
    assert.ok(Array.isArray(s.points) && s.points.length > 0, `${label}: points が空`);
    let hasValue = false;
    for (let i = 0; i < s.points.length; i++) {
      const p = s.points[i];
      assert.equal(typeof p.year, 'number', `${label}: points[${i}].year が数値でない`);
      assert.ok(nonEmpty(p.label), `${label}: points[${i}].label が空`);
      assert.ok(p.value === null || typeof p.value === 'number', `${label}: points[${i}].value が数値でも null でもない`);
      if (i > 0) assert.ok(s.points[i - 1].year < p.year, `${label}: year が昇順でない`);
      if (p.value !== null) hasValue = true;
    }
    assert.ok(hasValue, `${label}: 値が一つもない`);
  }
});
```

- [ ] **Step 2: テストを走らせて、データファイルがなくて失敗することを確認**

Run: `node --test tools/odaka-data.test.mjs`
Expected: `ENOENT ... odaka-timeline.json` で失敗。

- [ ] **Step 3: 空のデータファイルを3つ作る**

`src/data/odaka-timeline.json`:

```json
{
  "note": "震災後の小高区の計画・調査・事業・出来事。kind は plan（計画）/ survey（調査・ワークショップ）/ project（事業の着手・完成）/ event（出来事）。verified が false の項目は市の公開資料で確認できていないもので、note に理由を書く。",
  "items": []
}
```

`src/data/odaka-projects.json`:

```json
{
  "note": "小高区の主要事業。status は done（完成・稼働中）/ building（整備中）/ planned（計画中）/ suspended（中断・見直し）。current は現状の数字（表示用の文字列、時点と出典付き）。",
  "items": []
}
```

`src/data/odaka-numbers.json`:

```json
{
  "note": "小高区の数字。points の value は資料にない年は null。系列ごとの定義と時点は note に書く。",
  "series": []
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `node --test tools/odaka-data.test.mjs`
Expected: `# pass 5`、`# fail 0`。

- [ ] **Step 5: `package.json` に test スクリプトを追加**

`"scripts"` を次にする:

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test tools/odaka-data.test.mjs"
  },
```

Run: `npm test`
Expected: `# pass 5`。

- [ ] **Step 6: コミット**

```bash
git add tools/odaka-data.test.mjs src/data/odaka-timeline.json src/data/odaka-projects.json src/data/odaka-numbers.json package.json
git commit -m "test: 小高復興データ（odaka-*.json）の構造検証を追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 年表データの調査と下書き（計画・調査・出来事）

**Files:**
- Modify: `src/data/odaka-timeline.json`

方針: 市（`city.minamisoma.lg.jp`）、県、復興庁、経産省の公開ページを WebSearch／WebFetch で当たり、**出典 URL が取れた項目だけ `verified: true`** にする。取れない項目は載せたうえで `verified: false`、`sources: []`、`note` に「市の公開ページで資料を確認できていない。〜で言及がある」などと書く。年・月は資料に書かれたものを使い、資料になければ `month` を付けない。要約は「〜とされている」「資料によれば」の形にし、評価は書かない。

- [ ] **Step 1: 候補項目を一つずつ検索して確認する**

検索クエリの例（サイト指定で絞る）:

```
site:city.minamisoma.lg.jp 南相馬市復興計画 策定
site:city.minamisoma.lg.jp 復興総合計画
site:city.minamisoma.lg.jp 総合計画 小高
site:city.minamisoma.lg.jp 都市計画マスタープラン
site:city.minamisoma.lg.jp 小高区 再生 調査
site:city.minamisoma.lg.jp おだか まちづくり ワークショップ
site:city.minamisoma.lg.jp 小高区 避難指示解除 平成28年7月12日
site:city.minamisoma.lg.jp 避難区域 再編 小高区 平成24年
site:city.minamisoma.lg.jp 小高区 復興拠点 整備
site:reconstruction.go.jp 南相馬市 小高区 避難指示解除
```

候補リスト（すべて要確認。確認できた年月と内容に直す。載せる項目は候補に限らない）:

| 候補 | kind | 確認すること |
| --- | --- | --- |
| 東日本大震災・原発事故、小高区が警戒区域に | event | 2011年3〜4月。復興庁または市の避難区域ページ |
| 南相馬市復興計画 | plan | 策定年月、計画期間、小高区に関する記述 |
| 避難区域の再編（小高区が避難指示解除準備区域・居住制限区域に） | event | 2012年4月とされる。市の避難区域ページ |
| おだかまちづくりワークショップ | survey | 実施年、主催、まとめの資料 |
| 小高区再生調査 | survey | 市 HP に資料があるか。なければ `verified: false` |
| 南相馬市復興総合計画 | plan | 策定年月、計画期間 |
| 南相馬市都市計画マスタープラン | plan | 策定・改定年 |
| 小高区の避難指示解除 | event | 2016年7月12日 |
| 南相馬市第三次総合計画 | plan | 策定年、小高区の位置づけ |
| 小高区の主要事業の着手・完成（Task 3 の事業と `projectId` で対応） | project | 各事業の着手年・完成年 |

- [ ] **Step 2: `items` に書き込む**

1件の形（例。値は確認した資料に合わせる）:

```json
    {
      "year": 2016,
      "month": 7,
      "kind": "event",
      "title": "小高区の避難指示が解除される",
      "summary": "帰還困難区域を除く小高区の避難指示が解除された。",
      "sources": [{ "title": "南相馬市 避難指示の解除について", "url": "https://www.city.minamisoma.lg.jp/..." }],
      "verified": true
    },
    {
      "year": 2013,
      "kind": "survey",
      "title": "小高区再生調査",
      "summary": "小高区の再生に向けた課題を調べた調査とされる。",
      "sources": [],
      "verified": false,
      "note": "市の公開ページで報告書を確認できていない。実施年も未確認のため、暫定で置いている。"
    }
```

`year`、`month` の昇順に並べる。事業の着手・完成を年表に載せるときは `"projectId": "<Task 3 で付ける id>"` を付ける（Task 3 が先でもよい。両方そろってからテストが通る）。

- [ ] **Step 3: テストで構造を確認**

Run: `npm test`
Expected: `# fail 0`。`projectId` の参照先がまだない場合は Task 3 の後に再実行して確認する。

- [ ] **Step 4: コミット**

```bash
git add src/data/odaka-timeline.json
git commit -m "data: 小高区の計画・調査・出来事の年表データを下書き

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 主要事業データの調査と下書き

**Files:**
- Modify: `src/data/odaka-projects.json`
- Modify: `src/data/odaka-timeline.json`（事業の着手・完成を `kind: "project"` で追加）

- [ ] **Step 1: 事業ごとに検索して確認する**

検索クエリの例:

```
site:city.minamisoma.lg.jp 小高区 復興公営住宅
site:city.minamisoma.lg.jp 小高交流センター 来館者
site:city.minamisoma.lg.jp 小高ストア
site:city.minamisoma.lg.jp 小高 産業団地 フロンティア
site:city.minamisoma.lg.jp 川房 インターチェンジ スマートIC
site:city.minamisoma.lg.jp 小高区 事業所 再開
```

対象（候補。確認できたものを載せ、id は小文字英数字とハイフン）:

| id | 名前 | 確認すること |
| --- | --- | --- |
| `fukko-jutaku` | 復興公営住宅（小高区） | 団地名、戸数、完成年、入居状況 |
| `koryu-center` | 小高交流センター | 開館年月、年間来館者数（時点） |
| `odaka-store` | 小高ストア | 開店年月、運営主体、売上や利用者数が公開されていれば |
| `frontier-park` | フロンティアパーク（産業団地） | 正式名称、整備状況、分譲・立地企業数 |
| `kawabusa-ic` | 川房IC（スマートIC） | 正式名称、事業主体、供用予定、現状 |

「売上」「来場数」は市議会資料や指定管理者の報告など**公開資料に載っている数字だけ**を `current` に書く。載っていなければ `current: []` にして `body` に「公開資料では確認できていない」と書く。

- [ ] **Step 2: `items` に書き込む**

1件の形（例）:

```json
    {
      "id": "koryu-center",
      "name": "小高交流センター",
      "category": "拠点施設",
      "status": "done",
      "start": 2016,
      "end": 2018,
      "summary": "小高駅前に整備された、交流・情報発信・商業機能を持つ拠点施設。",
      "body": "避難指示解除後の小高区の中心として整備された。開館後の利用状況は市の資料による。",
      "current": [
        { "label": "年間来館者数", "value": "○万人", "asOf": "2025年度", "source": "https://www.city.minamisoma.lg.jp/..." }
      ],
      "sources": [{ "title": "南相馬市 小高交流センター", "url": "https://www.city.minamisoma.lg.jp/..." }],
      "verified": true
    }
```

`current[].value` は表示用の文字列（単位込み）。`asOf` は「2025年度」「2026年3月末」のように時点を書く。

- [ ] **Step 3: 年表に事業の着手・完成を追加**

`src/data/odaka-timeline.json` の `items` に、`kind: "project"`、`projectId: "<id>"` で着手・完成の項目を年月順の位置に差し込む。例:

```json
    {
      "year": 2018,
      "month": 1,
      "kind": "project",
      "title": "小高交流センターが開館",
      "summary": "小高駅前の拠点施設が開館した。",
      "projectId": "koryu-center",
      "sources": [{ "title": "南相馬市 小高交流センター", "url": "https://www.city.minamisoma.lg.jp/..." }],
      "verified": true
    }
```

- [ ] **Step 4: テスト**

Run: `npm test`
Expected: `# fail 0`。

- [ ] **Step 5: コミット**

```bash
git add src/data/odaka-projects.json src/data/odaka-timeline.json
git commit -m "data: 小高区の主要事業と現状のデータを下書き

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: 数字データの調査と下書き

**Files:**
- Modify: `src/data/odaka-numbers.json`

- [ ] **Step 1: 系列ごとに資料を探す**

検索クエリの例:

```
site:city.minamisoma.lg.jp 小高区 居住状況 居住者数
site:city.minamisoma.lg.jp 人口 世帯数 区別 小高区
site:city.minamisoma.lg.jp 移住 実績 件数
site:city.minamisoma.lg.jp 小高区 事業所 再開 件数
site:reconstruction.go.jp 避難指示解除区域 居住状況 南相馬市
```

系列（最低3本。`id` は固定）:

| id | title | 定義の候補 | 注意 |
| --- | --- | --- | --- |
| `registered` | 小高区の住民登録人口 | 住民基本台帳の小高区人口（各年の同じ時点） | 時点（月）を `note` に |
| `residents` | 小高区の居住者数 | 市が公表する「居住状況」の実際の居住者数 | 定義（住民票の有無を問わない等）を `note` に |
| `migrants` | 移住者数 | 市の移住支援の実績。小高区に限った数字がなければ市全体と明記 | 定義の違いを `note` に |
| `businesses` | 事業所・事業再開数 | 小高区で再開・新規開業した事業所数（市または商工会の公表値） | 経済センサスと混ぜない |

同じ系列の中で定義が変わる場合は、変わった年を `note` に書く。年が飛ぶ場合は途中の年を `value: null` で入れる（グラフの横軸が年で等間隔になるため）。

- [ ] **Step 2: `series` に書き込む**

1本の形（例）:

```json
    {
      "id": "residents",
      "title": "小高区の居住者数",
      "unit": "人",
      "kind": "line",
      "note": "市が公表する居住状況。各年3月末時点。住民票の有無にかかわらず、実際に居住している人数。",
      "source": { "title": "南相馬市 小高区の居住状況", "url": "https://www.city.minamisoma.lg.jp/..." },
      "points": [
        { "year": 2016, "label": "2016年", "value": 1234 },
        { "year": 2017, "label": "2017年", "value": 2345 },
        { "year": 2018, "label": "2018年", "value": null }
      ]
    }
```

- [ ] **Step 3: テスト**

Run: `npm test`
Expected: `# fail 0`。

- [ ] **Step 4: コミット**

```bash
git add src/data/odaka-numbers.json
git commit -m "data: 小高区の居住人口・移住者・事業所数の系列を下書き

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 年表コンポーネントと CSS

**Files:**
- Create: `src/data/odaka-types.ts`
- Create: `src/components/Timeline.astro`
- Modify: `src/styles/global.css`（末尾に追記）

- [ ] **Step 0: 型ファイル `src/data/odaka-types.ts` を書く**

```ts
// ミニアプリ「小高 復興のあゆみ」の JSON の型。odaka-timeline.json / odaka-projects.json に対応する。
export interface Source { title: string; url: string }

export interface TimelineItem {
  year: number;
  month?: number;
  kind: 'plan' | 'survey' | 'project' | 'event';
  title: string;
  summary: string;
  body?: string;
  projectId?: string;
  sources: Source[];
  verified: boolean;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  status: 'done' | 'building' | 'planned' | 'suspended';
  start: number;
  end?: number;
  summary: string;
  body?: string;
  current: { label: string; value: string; asOf: string; source: string }[];
  sources: Source[];
  verified: boolean;
}
```

- [ ] **Step 1: `Timeline.astro` を書く**

```astro
---
// 年表。計画・調査・事業・出来事を1本の時間軸に並べる。
// li の data-cat は絞り込み用（plan = 計画・調査, project = 事業, event = 出来事）。
import type { TimelineItem } from '../data/odaka-types';
interface Props {
  items: TimelineItem[];
  projectIds: Set<string>; // 存在する事業の id。アンカーを付けるかの判定に使う
  id?: string;
}
const { items, projectIds, id = 'timeline-list' } = Astro.props;

const KIND: Record<TimelineItem['kind'], { label: string; cat: string }> = {
  plan: { label: '計画', cat: 'plan' },
  survey: { label: '調査', cat: 'plan' },
  project: { label: '事業', cat: 'project' },
  event: { label: '出来事', cat: 'event' },
};
const sorted = [...items].sort((a, b) => a.year - b.year || (a.month ?? 0) - (b.month ?? 0));
const when = (it: TimelineItem) => (it.month ? `${it.year}年${it.month}月` : `${it.year}年`);
const iso = (it: TimelineItem) => (it.month ? `${it.year}-${String(it.month).padStart(2, '0')}` : String(it.year));
---
<ol class="timeline" id={id}>
  {sorted.map((it) => {
    const k = KIND[it.kind];
    const hasProject = it.projectId !== undefined && projectIds.has(it.projectId);
    return (
      <li data-cat={k.cat} class={`tl-${it.kind}`}>
        <time datetime={iso(it)}>{when(it)}</time>
        <div class="tl-body">
          <p class="tl-tags">
            <span class={`tl-kind tl-kind-${it.kind}`}>{k.label}</span>
            {!it.verified && <span class="tl-unverified">資料未確認</span>}
          </p>
          <h3>{it.title}</h3>
          <p>{it.summary}</p>
          {it.body && <p class="tl-detail">{it.body}</p>}
          {it.note && <p class="tl-note">{it.note}</p>}
          {(it.sources.length > 0 || hasProject) && (
            <p class="tl-links">
              {it.sources.map((s) => <a href={s.url} target="_blank" rel="noopener">{s.title}↗</a>)}
              {hasProject && <a href={`#project-${it.projectId}`}>この事業の今を見る →</a>}
            </p>
          )}
        </div>
      </li>
    );
  })}
</ol>
```

- [ ] **Step 2: CSS を `src/styles/global.css` の末尾に追記**

```css
/* 小高 復興のあゆみ: 年表 */
.timeline{list-style:none;padding:0 0 0 24px;margin:0 0 1.2em;border-left:2px solid #c7d2c4;display:grid;gap:16px}
.timeline li{position:relative;background:#fff;border-radius:8px;padding:16px 20px 6px;box-shadow:0 2px 10px #20492b0d}
.timeline li:before{content:'';position:absolute;left:-32px;top:18px;width:12px;height:12px;border-radius:50%;background:var(--green);border:2px solid var(--paper)}
.timeline li.tl-project:before{background:#b8862b}
.timeline li.tl-event:before{background:#5c6f5f}
.timeline time{display:block;font-size:13px;color:#5c6f5f;font-weight:700;margin-bottom:4px}
.prose .tl-tags,.prose .pc-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}
.tl-kind,.tl-unverified,.pc-cat,.pc-status{display:inline-block;font-size:12px;font-weight:600;line-height:1.5;padding:2px 10px;border-radius:4px;background:#e8efe3;color:var(--green)}
.tl-kind-project{background:#f6efdc;color:#7a5a12}
.tl-kind-event{background:#eceeea;color:#3f4d42}
.tl-unverified{background:#fbe9e5;color:#8a4b3a}
.prose .timeline h3{font-size:17px;margin:0 0 6px;line-height:1.6}
.prose .timeline p{font-size:15px;line-height:1.85;margin-bottom:.6em}
.prose .tl-note,.prose .pc-note{font-size:13px;color:#8a4b3a}
.prose .tl-links,.prose .pc-links{font-size:13px}
.tl-links a,.pc-links a{color:var(--green);margin-right:14px;white-space:nowrap}
```

- [ ] **Step 3: 一時ページでビルドが通ることを確認**

`src/pages/apps/odaka.astro` を仮に作る（Task 7 で置き換える）:

```astro
---
import Base from '../../layouts/Base.astro';
import Timeline from '../../components/Timeline.astro';
import tl from '../../data/odaka-timeline.json';
import pj from '../../data/odaka-projects.json';
const projectIds = new Set(pj.items.map((p) => p.id));
---
<Base title="小高 復興のあゆみ" description="仮" current="resources">
  <div class="page-body wrap"><article class="prose"><Timeline items={tl.items as any} projectIds={projectIds} /></article></div>
</Base>
```

Run: `npm run build && grep -c 'class="timeline"' dist/apps/odaka/index.html`
Expected: ビルド成功、出力は `1`。

- [ ] **Step 4: コミット**

```bash
git add src/data/odaka-types.ts src/components/Timeline.astro src/styles/global.css src/pages/apps/odaka.astro
git commit -m "feat: 年表コンポーネント Timeline.astro を追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 事業カードコンポーネントと CSS

**Files:**
- Create: `src/components/ProjectCard.astro`
- Modify: `src/styles/global.css`（末尾に追記）

- [ ] **Step 1: `ProjectCard.astro` を書く**

```astro
---
// 主要事業のカード。年表から #project-<id> でリンクされる。
import type { Project } from '../data/odaka-types';
interface Props { project: Project }
const { project: p } = Astro.props;
const STATUS: Record<Project['status'], string> = {
  done: '完成・稼働中',
  building: '整備中',
  planned: '計画中',
  suspended: '中断・見直し',
};
const period = p.end ? `${p.start}年〜${p.end}年` : `${p.start}年〜`;
---
<article class={`project-card is-${p.status}`} id={`project-${p.id}`}>
  <p class="pc-tags">
    <span class="pc-cat">{p.category}</span>
    <span class="pc-status">{STATUS[p.status]}</span>
    {!p.verified && <span class="tl-unverified">資料未確認</span>}
  </p>
  <h3>{p.name}</h3>
  <p class="pc-period">{period}</p>
  <p>{p.summary}</p>
  {p.body && <p class="pc-detail">{p.body}</p>}
  {p.current.length > 0 && (
    <dl class="pc-current">
      {p.current.map((c) => (
        <div>
          <dt>{c.label}</dt>
          <dd>{c.value}<small>{c.asOf}時点 · <a href={c.source} target="_blank" rel="noopener">出典↗</a></small></dd>
        </div>
      ))}
    </dl>
  )}
  {p.sources.length > 0 && (
    <p class="pc-links">{p.sources.map((s) => <a href={s.url} target="_blank" rel="noopener">{s.title}↗</a>)}</p>
  )}
</article>
```

- [ ] **Step 2: CSS を `src/styles/global.css` の末尾に追記**

```css
/* 小高 復興のあゆみ: 事業カード */
.project-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:0 0 1.2em}
.project-card{background:#fff;border-radius:8px;padding:18px 20px 8px;box-shadow:0 2px 10px #20492b0d;scroll-margin-top:24px}
.project-card.is-done .pc-status{background:#e8efe3;color:var(--green)}
.project-card.is-building .pc-status{background:#f6efdc;color:#7a5a12}
.project-card.is-planned .pc-status{background:#eceeea;color:#3f4d42}
.project-card.is-suspended .pc-status{background:#fbe9e5;color:#8a4b3a}
.prose .project-card h3{font-size:18px;margin:0 0 2px;line-height:1.6}
.prose .project-card p{font-size:15px;line-height:1.85;margin-bottom:.6em}
.prose .pc-period{font-size:13px;color:#5c6f5f}
.pc-current{margin:0 0 .8em;padding:12px 14px;background:#f3f7f0;border:1px solid #dfe8d8;border-radius:6px;display:grid;gap:8px}
.pc-current div{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}
.pc-current dt{font-size:13px;color:#5c6f5f}
.pc-current dd{margin:0;font-weight:700;text-align:right}
.pc-current small{display:block;font-size:11px;font-weight:400;color:#5c6f5f}
.pc-current small a{color:var(--green)}
@media(max-width:760px){.project-grid{grid-template-columns:1fr}.timeline{padding-left:18px}.timeline li:before{left:-26px}.timeline li{padding:14px 16px 4px}}
```

- [ ] **Step 3: 一時ページにカードを足してビルド確認**

`src/pages/apps/odaka.astro` の `<article>` 内に追記:

```astro
<div class="project-grid">{pj.items.map((p) => <ProjectCard project={p as any} />)}</div>
```

フロントマターに `import ProjectCard from '../../components/ProjectCard.astro';` を足す。

Run: `npm run build && grep -c 'project-card' dist/apps/odaka/index.html`
Expected: ビルド成功、出力は事業数以上の正の数。

- [ ] **Step 4: コミット**

```bash
git add src/components/ProjectCard.astro src/styles/global.css src/pages/apps/odaka.astro
git commit -m "feat: 事業カードコンポーネント ProjectCard.astro を追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: ページ本体と絞り込み

**Files:**
- Modify: `src/pages/apps/odaka.astro`（全面置き換え）
- Modify: `src/scripts/site.js`（絞り込みを `data-target` 対応に）
- Modify: `src/pages/resources.astro`（チップに `data-target` を付ける）

- [ ] **Step 1: `site.js` の絞り込みを複数リスト対応にする**

「資料集の絞り込み」のブロック（`const chips = ...` から `);` まで）を次に置き換える:

```js
  // 絞り込みチップ（資料集・年表）。.filter-chips の data-target で対象リストを指定する
  document.querySelectorAll('.filter-chips').forEach((group) => {
    const chips = group.querySelectorAll('.chip');
    const items = document.querySelectorAll(`${group.dataset.target || '#resource-list'} > li`);
    chips.forEach((chip) =>
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        chips.forEach((c) => {
          const active = c === chip;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', String(active));
        });
        items.forEach((item) => { item.hidden = filter !== 'all' && item.dataset.cat !== filter; });
      })
    );
  });
```

- [ ] **Step 2: `resources.astro` のチップに `data-target` を付ける**

```astro
        <div class="filter-chips" role="group" aria-label="取り組みで絞り込む" data-target="#resource-list">
```

- [ ] **Step 3: `odaka.astro` を本番の内容に置き換える**

```astro
---
import Base from '../../layouts/Base.astro';
import Breadcrumb from '../../components/Breadcrumb.astro';
import Toc from '../../components/Toc.astro';
import CtaBar from '../../components/CtaBar.astro';
import MiniChart from '../../components/MiniChart.astro';
import Timeline from '../../components/Timeline.astro';
import ProjectCard from '../../components/ProjectCard.astro';
import type { TimelineItem, Project } from '../../data/odaka-types';
import tl from '../../data/odaka-timeline.json';
import pj from '../../data/odaka-projects.json';
import nums from '../../data/odaka-numbers.json';

const items = tl.items as TimelineItem[];
const projects = pj.items as Project[];
const projectIds = new Set(projects.map((p) => p.id));
for (const it of items) {
  if (it.projectId && !projectIds.has(it.projectId)) console.warn(`[odaka] 年表「${it.title}」の projectId ${it.projectId} が odaka-projects.json にありません`);
}
const years = items.map((i) => i.year);
const firstYear = Math.min(...years);
const lastYear = Math.max(...years);
const unverified = [...items.filter((i) => !i.verified).map((i) => i.title), ...projects.filter((p) => !p.verified).map((p) => p.name)];
const allSources = [
  ...items.flatMap((i) => i.sources),
  ...projects.flatMap((p) => p.sources),
  ...nums.series.map((s) => s.source),
].filter((s, i, arr) => arr.findIndex((t) => t.url === s.url) === i);

const toc = [
  { id: 'timeline', label: '年表' },
  { id: 'projects', label: '主要事業の今' },
  { id: 'numbers', label: '数字で見る小高' },
  { id: 'check', label: 'まだ確かめたいこと' },
  { id: 'method', label: 'データと注意点' },
];
---
<Base title="小高 復興のあゆみ" description="震災後の小高区で、どんな計画や調査がつくられ、どんな事業が行われ、人口などの数字がどう動いたかを一つの時間軸で見る試作ページ。" current="resources">
  <Breadcrumb items={[{ label: '資料と数字', href: '/resources/' }, { label: '小高 復興のあゆみ' }]} />
  <section class="page-hero wrap">
    <div class="page-hero-copy">
      <p class="page-badge">ミニアプリ · 試作版</p>
      <h1><span class="nowrap">小高</span><span class="nowrap">復興のあゆみ</span></h1>
      <p class="page-lead">震災後の小高区で、どんな計画や調査がつくられ、どんな事業が行われ、人口などの数字がどう動いたかを、{firstYear}年から{lastYear}年まで一つの時間軸に並べました。<br class="pc" />「計画で示された課題が、今の事業にどう反映され、何が残っているか」を確かめるための入口です。</p>
      <p class="page-subtitle">データ：南相馬市・福島県・復興庁の公開資料（出典は各項目に記載）</p>
    </div>
  </section>

  <div class="page-body wrap">
    <Toc items={toc} />
    <article class="prose">
      <section id="timeline">
        <h2>年表</h2>
        <p>計画・調査、事業、出来事を同じ時間軸に並べています。「資料未確認」の項目は、市の公開ページで元の資料を見つけられていないものです。項目の存在自体を含めて、確かめていきます。</p>
        <div class="filter-chips" role="group" aria-label="種類で絞り込む" data-target="#timeline-list">
          <button type="button" class="chip is-active" data-filter="all" aria-pressed="true">すべて</button>
          <button type="button" class="chip" data-filter="plan" aria-pressed="false">計画・調査</button>
          <button type="button" class="chip" data-filter="project" aria-pressed="false">事業</button>
          <button type="button" class="chip" data-filter="event" aria-pressed="false">出来事</button>
        </div>
        <Timeline items={items} projectIds={projectIds} />
      </section>

      <section id="projects">
        <h2>主要事業の今</h2>
        <p>小高区の主な事業について、完成したものは現状の数字を、まだ完成していないものは状況を書いています。数字は公開資料に載っているものだけを、時点と出典付きで載せています。</p>
        <div class="project-grid">
          {projects.map((p) => <ProjectCard project={p} />)}
        </div>
      </section>

      <section id="numbers">
        <h2>数字で見る小高</h2>
        <p>小高区の人の動きと事業所の数です。住民登録の人口と、実際に住んでいる人の数は別の統計で、定義も違います。それぞれの定義と時点は、グラフの下の注記と「データと注意点」に書いています。</p>
        <div class="chart-grid">
          {nums.series.map((s) => (
            <MiniChart title={s.title} unit={s.unit} kind={s.kind as 'bar' | 'line'} decimals={0} note={s.note} points={s.points} />
          ))}
        </div>
      </section>

      <section id="check">
        <h2>まだ確かめたいこと</h2>
        <ul class="check-list">
          {unverified.length > 0 && <li>資料を確認できていない項目：{unverified.join('、')}。市に資料が残っているか、どこで見られるかを確かめる</li>}
          <li>計画や調査で挙げられた課題のうち、その後の事業で対応されたものと、まだ残っているもの</li>
          <li>完成した施設の利用状況と運営費が、計画時の見込みとどう違うか</li>
          <li>居住者数と住民登録人口の差が、どんな人（通い、二地域居住など）によるものか</li>
        </ul>
      </section>

      <section id="method">
        <h2>データと注意点</h2>
        <p>年表と事業の内容は、南相馬市・福島県・復興庁などが公開している資料から書き起こしています。資料に書かれていることを要約したもので、評価や解釈は含めていません。数字は公開資料の値をそのまま使い、資料にない年は空けています。</p>
        <ol class="action-list">
          <li><h3>資料未確認の項目</h3><p>市の公開ページで元の資料を見つけられなかった項目は、「資料未確認」と表示したうえで年表に載せています。記憶や伝聞にもとづく暫定の記述なので、資料が見つかり次第、直します。</p></li>
          <li><h3>人口の2つの数字</h3><p>住民登録人口は住民基本台帳にもとづく数で、避難先で暮らす人も含みます。居住者数は市が別に把握している、実際に小高区で暮らしている人の数です。時点や集計方法は資料ごとに違うため、各グラフの注記を見てください。</p></li>
          <li><h3>更新のしかた</h3><p>このページの内容はすべて JSON ファイルに置いています。誤りや新しい資料があれば、<a href="/#contact" data-open="contact">お問い合わせ</a>からお知らせください。</p></li>
        </ol>
        <h3>出典一覧</h3>
        <ul class="source-list">
          {allSources.map((s) => <li><a href={s.url} target="_blank" rel="noopener">{s.title}↗</a></li>)}
        </ul>
      </section>
    </article>
  </div>
  <CtaBar />
</Base>
```

`src/styles/global.css` の末尾に追記:

```css
.prose .source-list{font-size:14px;padding-left:1.2em}.prose .source-list li{margin-bottom:6px}.source-list a{color:var(--green)}
```

- [ ] **Step 4: ビルドして出力を確認**

Run:

```bash
npm run build && grep -c 'data-target="#timeline-list"' dist/apps/odaka/index.html && grep -c 'mini-chart' dist/apps/odaka/index.html && grep -c 'data-target="#resource-list"' dist/resources/index.html
```

Expected: ビルド成功。3つの出力がすべて `1` 以上（`mini-chart` は系列数以上）。ビルドログに `[odaka]` の警告が出ていないこと。

- [ ] **Step 5: 資料集の絞り込みが壊れていないことを確認**

`.claude/launch.json` の `site` でプレビューを開き、`/resources/` のチップを押して一覧が絞り込まれることを `read_page` で確認する。

- [ ] **Step 6: コミット**

```bash
git add src/pages/apps/odaka.astro src/scripts/site.js src/pages/resources.astro src/styles/global.css
git commit -m "feat: ミニアプリ「小高 復興のあゆみ」のページと年表の絞り込みを追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: 一覧へのリンクと README

**Files:**
- Modify: `src/pages/index.astro`（ミニアプリのカード）
- Modify: `src/pages/resources.astro`（`#apps` の `app-list`）
- Modify: `src/styles/global.css`（アプリ用アート `.resource-art.line`）
- Modify: `README.md`, `tools/README.md`

- [ ] **Step 1: アート用 CSS を `global.css` 末尾に追記**

```css
/* ミニアプリ一覧: 年表のアート */
.resource-art.line:before{content:'';position:absolute;left:14%;right:14%;top:50%;height:3px;background:#c7d2c4;transform:translateY(-50%)}
.resource-art.line i{position:absolute;top:50%;width:16px;height:16px;border-radius:50%;background:var(--green);border:3px solid #fff;transform:translate(-50%,-50%)}
.resource-art.line i:nth-child(2){left:20%}.resource-art.line i:nth-child(3){left:44%;background:#b8862b}.resource-art.line i:nth-child(4){left:66%}.resource-art.line i:nth-child(5){left:84%;background:#5c6f5f}
```

- [ ] **Step 2: `index.astro` に資料カードを追加**

「まちの健康診断」の `resource-card` の直後に追加:

```astro
    <div class="resource-card">
      <div class="resource-art line"><span class="badge">試作版</span><i></i><i></i><i></i><i></i></div>
      <h3>小高 復興のあゆみ</h3>
      <p>計画・調査と事業、人口の数字を、<br />震災後の一つの時間軸で見る。</p>
      <a class="outline" href="/apps/odaka/">見てみる <span>→</span></a>
    </div>
```

- [ ] **Step 3: `resources.astro` の `app-list` にカードを追加**

「南相馬 まちの健康診断」の `app-item` の直後に追加:

```astro
          <article id="odaka" class="app-item">
            <div class="resource-art line"><span class="badge">試作版</span><i></i><i></i><i></i><i></i></div>
            <div>
              <h3>小高 復興のあゆみ</h3>
              <p>震災後の小高区の計画・調査、主要事業の現状、居住人口などの数字を一つの時間軸に並べて見られます。市の公開資料で確認できていない項目は「資料未確認」と表示しています。</p>
              <p class="meta">データ：南相馬市・福島県・復興庁の公開資料（出典は各項目に記載）</p>
              <a class="button" href="/apps/odaka/">試作版を見る <span>→</span></a>
            </div>
          </article>
```

同じセクションの導入文「どちらも試作版を公開しました。」を「いずれも試作版を公開しました。」に直す。

- [ ] **Step 4: `README.md` の「ファイル」に追記**

「まちの健康診断」の行の直後に追加:

```markdown
- `src/pages/apps/odaka.astro`: ミニアプリ「小高 復興のあゆみ」。年表は `src/data/odaka-timeline.json`、主要事業は `src/data/odaka-projects.json`、数字は `src/data/odaka-numbers.json`（年表は `src/components/Timeline.astro`、事業カードは `ProjectCard.astro`）。**中身を直すときは JSON だけ編集**し、`npm test` で構造を確かめる
```

「試作段階の項目」の文中「「まちの健康診断」（総務省の決算カードをPDFから機械的に読み取ったもの）」の後に「、「小高 復興のあゆみ」（公開資料から書き起こした年表。資料未確認の項目を含む）」を足す。

- [ ] **Step 5: `tools/README.md` に追記**

末尾に追加:

```markdown

## odaka-data.test.mjs

`src/data/odaka-timeline.json`・`odaka-projects.json`・`odaka-numbers.json`（ミニアプリ「小高 復興のあゆみ」）の構造を確かめます。出典の有無、`verified` と `note` の対応、年表の並び順、`projectId` の参照先、数字の型を見ます。中身の事実関係は見ません。

```sh
npm test
```
```

- [ ] **Step 6: ビルドとテスト**

Run: `npm test && npm run build && grep -c '/apps/odaka/' dist/index.html dist/resources/index.html`
Expected: テスト `# fail 0`、ビルド成功、両ファイルで `1` 以上。

- [ ] **Step 7: コミット**

```bash
git add src/pages/index.astro src/pages/resources.astro src/styles/global.css README.md tools/README.md
git commit -m "feat: トップと資料集に「小高 復興のあゆみ」へのリンクを追加し、READMEを更新

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: ブラウザ検証

**Files:** なし（修正が出たら該当ファイル）

- [ ] **Step 1: ビルドしてプレビューを開く**

Run: `npm run build`
その後、`preview_start` で `.claude/launch.json` の `site` を起動し、`/apps/odaka/` を開く。

- [ ] **Step 2: 確認項目**

1. `read_console_messages` にエラーがない。
2. 年表のチップ「計画・調査」「事業」「出来事」を順に押し、`read_page` で表示される項目の種類バッジが一致する。「すべて」で全項目が戻る。
3. 年表の「この事業の今を見る →」を押すと、対応する `#project-<id>` のカードまでスクロールする。
4. 数字のグラフが系列数ぶん描画され、`null` の年が空いている。
5. `resize_window` の `mobile` で、年表が1列、事業カードが1列、チップが折り返し、横スクロールが出ない。
6. `/resources/` の絞り込みが引き続き動く。

- [ ] **Step 3: 崩れがあれば CSS を直し、ビルドし直して再確認**

- [ ] **Step 4: スクリーンショットを撮って結果を報告し、修正があればコミット**

```bash
git add -A src/styles/global.css
git commit -m "style: 小高 復興のあゆみ のスマートフォン表示を調整

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## 実装時の変更点（計画からの差分）

- 年表・事業カードの CSS は詳細度を `.prose .timeline p.tl-note` のように要素付きに上げ、出典リンクは `nowrap` をやめて flex で折り返す。長い URL であふれないよう `min-width:0;overflow-wrap:anywhere` のガードを追加。
- `MiniChart.astro` に `yearSuffix?: '年' | '年度'` を追加（既定は「年度」で既存ページは不変）。数字の系列 JSON にも `yearSuffix` を持たせる。
- トップページの資料カード一覧は、導入＋カード3枚の4列から「導入が2行またぎ＋カード2×2」に組み替えた（4枚目のカードが崩れたため）。
- 数字の系列は「事業所・事業再開数」の公開値が見つからず3本（住民登録人口・居住者数・移住者数）。未収録であることはページの「まだ確かめたいこと」に明記。
- テストに、要約は一文・本文と注記に URL なし・`asOf` の接尾辞禁止・`yearSuffix` の列挙を追加。

## 完了の条件

- `npm test` と `npm run build` が通る。
- `/apps/odaka/` に年表（絞り込み付き）、主要事業カード、数字のグラフ3本以上、まだ確かめたいこと、データと注意点がある。
- JSON の全項目に出典があるか、`verified: false` と `note` がある。
- トップと資料集からリンクされている。
