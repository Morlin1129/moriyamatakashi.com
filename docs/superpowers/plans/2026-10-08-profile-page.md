# プロフィールページ改修 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/profile/` を 4 章構成（自己紹介／南相馬で取り組んできたこと／IT・業務改善の仕事／経歴・受賞・外部掲載）に作り直し、地域活動と IT の実績を数字つきで示す。

**Architecture:** 構造データ（分野カード・年表・数字タイル・実践例・経歴・掲載記事・アイコン帯）を `src/data/profile.ts` に置き、`tools/profile-data.test.mjs` で構造を確かめる。表示は `src/components/profile/` の 4 コンポーネントに分け、`src/pages/profile.astro` は文章と組み立てだけにする。写真はリーフレット PDF から取り出して `public/assets/profile/` に置く。

**Tech Stack:** Astro 7、Sass（既存トークン `src/styles/abstracts/_tokens.scss`）、Node 22.20（`node --test`。`.ts` を直接 import できる）、poppler `pdfimages`、Python Pillow（webp 変換）

設計書: `docs/superpowers/specs/2026-10-08-profile-page-design.md`

前提: ビルドとテストは nodebrew の Node を使う。各コマンドの前に `export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH"` を付ける。

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `public/assets/profile/place.webp` ほか | リーフレットから取り出した写真 4 枚とアイコン 4 つ |
| `src/data/profile.ts` | プロフィールの構造データと型 |
| `tools/profile-data.test.mjs` | データの構造テスト（空文字・URL・年表の順序） |
| `src/components/profile/BadgeStrip.astro` | アイコンの帯（移住して 12 年 など 4 つ） |
| `src/components/profile/FieldCards.astro` | 写真つきの分野カード（4 枚） |
| `src/components/profile/Milestones.astro` | 年表（年・出来事） |
| `src/components/profile/StatTiles.astro` | 数字タイル（3 つ） |
| `src/pages/profile.astro` | ヒーロー・文章・組み立て |
| `README.md` | ファイル一覧にプロフィールのデータと部品を追記 |

---

### Task 1: 写真とアイコンを取り出す

**Files:**
- Create: `public/assets/profile/place.webp`, `education.webp`, `dialogue.webp`, `coffee.webp`, `badge-years.webp`, `badge-it.webp`, `badge-place.webp`, `badge-family.webp`

- [ ] **Step 1: PDF の 1 ページ目の画像を作業ディレクトリに取り出す**

```bash
WORK=/private/tmp/claude-501/-Users-moriyama-work-----moriyamatakashi-com/c8b83963-7e3a-4c1e-92a5-d51beab09275/scratchpad/leaflet
mkdir -p "$WORK" && cd "$WORK"
pdfimages -f 1 -l 1 -png "/Users/moriyama/Downloads/政治活動リーフレット_B4二つ折り_初稿.pdf (10).pdf" img
ls img-0*.png | wc -l
```

Expected: `21`（img-000〜img-020）。対応は 010=カフェ店内、007=パソコン教室、008=地図と付箋、020=コーヒーを淹れる、014〜017=アイコン（家／ノート PC／拠点と人／親子）。

- [ ] **Step 2: webp に変換して `public/assets/profile/` に置く**

```bash
cd "/Users/moriyama/work/市議選/moriyamatakashi.com" && mkdir -p public/assets/profile
python3 -I - "$WORK" <<'EOF'
import sys, os
from PIL import Image
src = sys.argv[1]
out = 'public/assets/profile'
photos = {'img-010.png': 'place', 'img-007.png': 'education', 'img-008.png': 'dialogue', 'img-020.png': 'coffee'}
badges = {'img-014.png': 'badge-years', 'img-015.png': 'badge-it', 'img-016.png': 'badge-place', 'img-017.png': 'badge-family'}
for name, dest in photos.items():
    im = Image.open(os.path.join(src, name)).convert('RGB')
    im.save(f'{out}/{dest}.webp', 'WEBP', quality=82)
for name, dest in badges.items():
    im = Image.open(os.path.join(src, name)).convert('RGBA')
    im.save(f'{out}/{dest}.webp', 'WEBP', quality=90)
print(sorted(os.listdir(out)))
EOF
```

Expected: 8 ファイルの一覧。

- [ ] **Step 3: 中身を目で確かめる**

`public/assets/profile/place.webp` などを Read で開き、取り違えがないか見る（place=店内に人、education=教室、dialogue=地図に付箋、coffee=ドリップ）。

- [ ] **Step 4: Commit**

```bash
git add public/assets/profile
git commit -m "feat: プロフィール用の写真とアイコンをリーフレットから追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 構造データとテスト

**Files:**
- Create: `src/data/profile.ts`
- Create: `tools/profile-data.test.mjs`

- [ ] **Step 1: 失敗するテストを書く**

```js
// tools/profile-data.test.mjs
// src/data/profile.ts の構造を確かめる。中身（事実）の正しさは見ない。
import test from 'node:test';
import assert from 'node:assert/strict';

const data = await import('../src/data/profile.ts');
const { BADGES, FIELDS, MILESTONES, STATS, CASES, CAREER, PRESS, WORK_URL } = data;

const isUrl = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

test('アイコンの帯: 4 つあり、画像とラベルが埋まっている', () => {
  assert.equal(BADGES.length, 4);
  for (const b of BADGES) {
    assert.ok(b.icon.startsWith('/assets/profile/badge-'), `${b.label}: icon のパスが不正`);
    assert.ok(nonEmpty(b.label));
  }
});

test('分野カード: 4 枚あり、写真・本文があり、数字と外部リンクは形式が正しい', () => {
  assert.equal(FIELDS.length, 4);
  for (const f of FIELDS) {
    assert.ok(nonEmpty(f.id) && nonEmpty(f.name), 'id/name が空');
    assert.ok(f.image.src.startsWith('/assets/profile/'), `${f.name}: 写真のパスが不正`);
    assert.ok(nonEmpty(f.image.alt), `${f.name}: 写真の alt が空`);
    assert.ok(f.body.length > 0 && f.body.every(nonEmpty), `${f.name}: 本文が空`);
    assert.ok(f.facts.every(nonEmpty), `${f.name}: 数字の行に空がある`);
    if (f.link) assert.ok(nonEmpty(f.link.label) && isUrl(f.link.href), `${f.name}: リンクが不正`);
  }
});

test('年表: 各行に年と出来事があり、年の昇順に並んでいる', () => {
  assert.ok(MILESTONES.length >= 8);
  for (const m of MILESTONES) {
    assert.ok(Number.isInteger(m.year), `${m.text}: year が整数でない`);
    assert.ok(nonEmpty(m.when) && nonEmpty(m.text));
  }
  for (let i = 1; i < MILESTONES.length; i++) {
    assert.ok(MILESTONES[i - 1].year <= MILESTONES[i].year, `「${MILESTONES[i].text}」の順序が前後している`);
  }
});

test('数字タイル: 3 つあり、値・ラベル・補足が埋まっている', () => {
  assert.equal(STATS.length, 3);
  for (const s of STATS) assert.ok(nonEmpty(s.value) && nonEmpty(s.label) && nonEmpty(s.note), `${s.label}: 空がある`);
});

test('実践例・経歴・掲載記事: 空がなく URL は http で始まる', () => {
  assert.ok(CASES.length >= 3);
  for (const c of CASES) assert.ok(nonEmpty(c.title) && nonEmpty(c.text));
  assert.ok(CAREER.length >= 6);
  for (const [k, v] of CAREER) assert.ok(nonEmpty(k) && nonEmpty(v));
  assert.ok(PRESS.length >= 5);
  for (const p of PRESS) assert.ok(nonEmpty(p.outlet) && nonEmpty(p.title) && isUrl(p.url), `${p.title}: 不正`);
  assert.ok(isUrl(WORK_URL));
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

```bash
export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && node --test tools/profile-data.test.mjs
```

Expected: `Cannot find module ... src/data/profile.ts` で失敗。

- [ ] **Step 3: データを書く**

```ts
// src/data/profile.ts
// プロフィールページ（src/pages/profile.astro）の構造データ。
// 文章の段落はページ側に書き、数字・年表・リンクなど後から直すものをここに置く。
// 出典: 政治活動リーフレット、AI 勉強会スライド（2026年9月）、DRIVE メディア・greenz.jp・HOOK の記事、本人聞き取り。
// 設計は docs/superpowers/specs/2026-10-08-profile-page-design.md

export interface Badge {
  icon: string;
  label: string;
}

export interface Field {
  id: string;
  name: string;
  image: { src: string; alt: string };
  body: string[]; // 段落
  facts: string[]; // 数字の行（ないときは空配列）
  link?: { label: string; href: string };
}

export interface Milestone {
  year: number; // 並び順の確認用
  when: string; // 表示用（「2015〜16年」など）
  text: string;
}

export interface Stat {
  value: string;
  label: string;
  note: string;
}

export interface Case {
  title: string;
  text: string;
}

export interface Press {
  outlet: string;
  title: string;
  date?: string;
  url: string;
}

// オムスビの制作・開発実績
export const WORK_URL = 'https://omsb.co/work';
// 受託制作した市の子育て応援サイト
export const KOSODATE_URL = 'https://minamisoma-kosodate.net/';

// 01 自己紹介の下に並べるアイコンの帯（リーフレットの表紙と同じ 4 つ）
export const BADGES: Badge[] = [
  { icon: '/assets/profile/badge-years.webp', label: '移住して12年' },
  { icon: '/assets/profile/badge-it.webp', label: 'IT・業務改善' },
  { icon: '/assets/profile/badge-place.webp', label: '地域拠点を運営' },
  { icon: '/assets/profile/badge-family.webp', label: '子育て中' },
];

// 02 リーフレットの「この地域でやってきたこと」4 分野
export const FIELDS: Field[] = [
  {
    id: 'place',
    name: 'まちの暮らしと場づくり',
    image: { src: '/assets/profile/place.webp', alt: 'アオスバシの店内に集まる人たち' },
    body: [
      '避難指示が解除された直後の2016年末、仲間とキッチンカーのコーヒースタンドを小高駅前で始めました。2018年に常設の店舗、2023年には空き店舗だった寿司店を改装して、カフェ・小売・コワーキングを備えた地域拠点「アオスバシ」を開きました。',
      '「やってみたい」を持つ人が、小さく始められる場所にしています。',
    ],
    facts: [
      'アオスバシの来店者は年間約5,000人',
      'ここから独立して事業を始めた人 2名。拠点を使って事業を行う人 7（個人5・団体2）',
    ],
  },
  {
    id: 'education',
    name: '教育・若者支援',
    image: { src: '/assets/profile/education.webp', alt: 'パソコン教室で教えている様子' },
    body: [
      '子どもや若者が地域で学び、挑戦できる機会づくりに関わってきました。高校でのプログラミング指導、大人向けのIT寺子屋、英語の学びのコミュニティなど、ITと英語の学びの場を中心に続けています。',
    ],
    facts: ['小高産業技術高校でプログラミング指導 10年（うち2年は実務家教員）', 'IT寺子屋 11年継続'],
  },
  {
    id: 'dialogue',
    name: '地域・事業者との意見交換',
    image: { src: '/assets/profile/dialogue.webp', alt: '地図に付箋を貼って意見を出し合うワークショップ' },
    body: [
      '移住した直後は、小高の情報誌の発刊や、ITで帰還支援を考えるハッカソンの開催に関わりました。その後も地域の意見交換の場に参加し、地域の人や事業者の声を聞き、課題やアイデアを一緒に整理してきました。',
    ],
    facts: [],
  },
  {
    id: 'it',
    name: 'IT・業務改善／事業支援',
    image: { src: '/assets/profile/coffee.webp', alt: 'アオスバシでコーヒーを淹れる森山貴士' },
    body: [
      'ITやAIを使った業務改善や、地域の事業者の仕事づくりと情報発信を支援してきました。南相馬市の子育て応援サイトも受託して制作しています。',
    ],
    facts: [],
    link: { label: '南相馬市 子育て応援サイト', href: KOSODATE_URL },
  },
];

// 02 あゆみ（記事で確認できた年月。宿題カフェは載せない）
export const MILESTONES: Milestone[] = [
  { year: 2014, when: '2014年7月', text: '南相馬市へ移住。ITエンジニアとして独立。最初は原町区に住み、小高で活動を始める' },
  { year: 2015, when: '2015〜16年', text: '情報誌「小高の小数力」を発刊。ITで帰還支援を考えるハッカソンを開催' },
  { year: 2016, when: '2016年12月', text: '避難指示解除後の小高駅前で、仲間とキッチンカーのコーヒースタンド「Odaka Micro Stand Bar」を開業' },
  { year: 2017, when: '2017年3月', text: '「Odaka Micro Coffee Lights」。コーヒー1杯でソーラーライト1本を高校生の下校路に設置。約2か月で150本以上' },
  { year: 2017, when: '2017年4月', text: '一般社団法人オムスビを設立' },
  { year: 2018, when: '2018年6月', text: '小高駅前に常設店舗を開業' },
  { year: 2018, when: '2018〜19年', text: '南相馬市の移住体験施設「お試しハウス」の運営を受託' },
  { year: 2023, when: '2023年1月', text: 'オムスビとして令和4年度「新しい東北」復興・創生の星顕彰を受賞' },
  { year: 2023, when: '2023年7月', text: '複合施設「アオスバシ」を開業' },
];

// 03 数字のある実績（AI 勉強会スライドより。公開前に測定条件とクライアントの承諾を確認する）
export const STATS: Stat[] = [
  { value: '5倍', label: 'Webサイトのアクセス数', note: 'リニューアル前後で5倍に。安定して稼働するサイトへ' },
  { value: '6倍', label: '問い合わせ率の改善', note: '0.2%から1.2%へ' },
  { value: '約100万円', label: '年間コストの削減', note: '独自CRMと電子契約の連携による' },
];

// 03 業務改善の実践例（クライアント名は出さない）
export const CASES: Case[] = [
  { title: '不動産情報の管理システム', text: '問い合わせと物件情報の管理・分析を一元化し、業務の工数を削減' },
  { title: '大手小売業のナレッジ管理改善', text: '社内に蓄積された知識や業務情報を、必要な人が使いやすくする改善プロジェクトに参画' },
  { title: '卸売業の業務改善', text: '現場の業務の流れを整理し、仕事の進め方や情報管理の改善を検討するプロジェクトに参画' },
];

// 04 経歴
export const CAREER: [string, string][] = [
  ['出身', '大阪市'],
  ['学歴', '立命館大学 政策科学部 卒業'],
  ['2009年〜', '東京のIT企業でソフトウェア開発・先端技術研究（約5年）'],
  ['2014年', '南相馬市へ移住。個人事業主として起業'],
  ['2017年', '一般社団法人オムスビ 設立（代表理事）'],
  ['2023年', '地域拠点「アオスバシ」を開業'],
  ['今の仕事', 'ITエンジニア・業務改善コンサルタント／コンサルティング会社のIT顧問'],
  ['受賞', '令和4年度「新しい東北」復興・創生の星顕彰（一般社団法人オムスビとして）'],
];

// 04 外部掲載
export const PRESS: Press[] = [
  {
    outlet: 'greenz.jp',
    title: '福島県南相馬市小高区に移住し、カフェ兼コワーキングスペースを開業した森山貴士さんのローカルでの戦い方',
    date: '2023年10月',
    url: 'https://greenz.jp/2023/10/20/fukushima12_moriyama-takashi/',
  },
  {
    outlet: 'DRIVEメディア',
    title: 'ヨソモノのITエンジニアが、震災後の南相馬で「ゼロからのまちづくり」に取り組むまで',
    url: 'https://drivemedia.etic.or.jp/30042',
  },
  {
    outlet: 'HOOK',
    title: '小高で「みんなが挑戦できる」まちづくりを',
    url: 'https://fukushima-hook.jp/interview_moriyama/',
  },
  {
    outlet: '福島民友',
    title: '名店からパン仕入れ、南相馬「アオスバシ」開店 元すし店を改修',
    date: '2023年7月',
    url: 'https://www.minyu-net.com/gourmet/shoku/FM20230703-788880.php',
  },
  {
    outlet: '復興庁',
    title: '令和4年度「新しい東北」復興・創生の星顕彰 選定結果',
    date: '2023年1月',
    url: 'https://www.reconstruction.go.jp/topics/m23/01/230106_senteikekka.pdf',
  },
];
```

- [ ] **Step 4: テストが通ることを確かめる**

```bash
export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm test
```

Expected: 既存のテストも含めて全部 `pass`、`fail 0`。

- [ ] **Step 5: Commit**

```bash
git add src/data/profile.ts tools/profile-data.test.mjs
git commit -m "feat: プロフィールの構造データと構造テストを追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 表示コンポーネント 4 つ

**Files:**
- Create: `src/components/profile/BadgeStrip.astro`
- Create: `src/components/profile/FieldCards.astro`
- Create: `src/components/profile/Milestones.astro`
- Create: `src/components/profile/StatTiles.astro`

Sass の変数（`$line` `$muted` `$shadow-card` など）と `@include mobile` は、`astro.config.mjs` の設定で各コンポーネントの `<style lang="scss">` に自動で読み込まれている（既存の `SnsLinks.astro` と同じ書き方）。

- [ ] **Step 1: BadgeStrip.astro を書く**

```astro
---
// アイコンの帯（移住して12年 など）。データは src/data/profile.ts の BADGES
import { BADGES } from '../../data/profile';
---
<ul class="badge-strip" aria-label="森山貴士のいま">
  {BADGES.map((b) => (
    <li>
      <img src={b.icon} alt="" width="56" height="56" loading="lazy" />
      <span>{b.label}</span>
    </li>
  ))}
</ul>

<style lang="scss">
.badge-strip {
  list-style: none;
  padding: 0;
  margin: 8px 0 1.2em;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: $tint;
    border: 1px solid $line;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    color: var(--green);
  }

  img {
    width: 56px;
    height: 56px;
    flex: none;
  }

  @include mobile {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;

    li {
      font-size: 13px;
      padding: 8px 10px;
    }

    img {
      width: 44px;
      height: 44px;
    }
  }
}
</style>
```

- [ ] **Step 2: FieldCards.astro を書く**

```astro
---
// 南相馬で取り組んできた 4 分野のカード（写真・本文・数字の行・外部リンク）。データは src/data/profile.ts の FIELDS
import { FIELDS } from '../../data/profile';
---
<ul class="field-cards">
  {FIELDS.map((f) => (
    <li id={`field-${f.id}`}>
      <img src={f.image.src} alt={f.image.alt} loading="lazy" />
      <div class="fc-body">
        <h3>{f.name}</h3>
        {f.body.map((p) => <p>{p}</p>)}
        {f.facts.length > 0 && (
          <ul class="fc-facts">{f.facts.map((t) => <li>{t}</li>)}</ul>
        )}
        {f.link && (
          <p class="fc-link"><a href={f.link.href} target="_blank" rel="noopener">{f.link.label}↗</a></p>
        )}
      </div>
    </li>
  ))}
</ul>

<style lang="scss">
.field-cards {
  list-style: none;
  padding: 0;
  margin: 0 0 1.4em;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;

  > li {
    background: #fff;
    border-radius: 8px;
    box-shadow: $shadow-card;
    overflow: hidden;
    min-width: 0;
  }

  img {
    width: 100%;
    aspect-ratio: 1.6;
    object-fit: cover;
    display: block;
  }

  @include mobile {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

.fc-body {
  padding: 16px 18px 10px;
}

// 数字の行。薄い緑の囲みで本文と見分ける
.fc-facts {
  list-style: none;
  padding: 10px 14px;
  margin: 0 0 0.8em;
  background: $tint;
  border: 1px solid $line;
  border-radius: 6px;
  display: grid;
  gap: 4px;

  li {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.7;
    color: var(--green);
    padding-left: 1.1em;
    text-indent: -1.1em;

    &:before {
      content: '◆';
      font-size: 10px;
      margin-right: 0.5em;
      vertical-align: 0.1em;
    }
  }
}

// 親ページの .prose はこのコンポーネントの外なので :global で拾う
:global(.prose) .field-cards {
  h3 {
    font-size: 18px;
    margin: 0 0 8px;
    line-height: 1.6;
  }

  p {
    font-size: 15px;
    line-height: 1.85;
    margin-bottom: 0.7em;
  }

  p.fc-link {
    font-size: 13px;
  }
}
</style>
```

- [ ] **Step 3: Milestones.astro を書く**

```astro
---
// あゆみ（年・出来事の年表）。データは src/data/profile.ts の MILESTONES
import { MILESTONES } from '../../data/profile';
---
<dl class="milestones">
  {MILESTONES.map((m) => (
    <div>
      <dt>{m.when}</dt>
      <dd>{m.text}</dd>
    </div>
  ))}
</dl>

<style lang="scss">
.milestones {
  margin: 0 0 1.2em;
  padding-left: 18px;
  border-left: 2px solid $underline;
  display: grid;
  gap: 12px;

  div {
    position: relative;
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 14px;
    align-items: baseline;

    &:before {
      content: '';
      position: absolute;
      left: -25px;
      top: 0.55em;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--green);
      border: 2px solid var(--paper);
    }
  }

  dt {
    font-size: 14px;
    font-weight: 700;
    color: $green-soft;
    white-space: nowrap;
  }

  dd {
    margin: 0;
    font-size: 15px;
    line-height: 1.85;
  }

  @include mobile {
    padding-left: 14px;

    div {
      grid-template-columns: 1fr;
      gap: 2px;

      &:before {
        left: -21px;
      }
    }
  }
}
</style>
```

- [ ] **Step 4: StatTiles.astro を書く**

```astro
---
// 数字で示す実績のタイル。データは src/data/profile.ts の STATS
import { STATS } from '../../data/profile';
---
<ul class="stat-tiles">
  {STATS.map((s) => (
    <li>
      <strong>{s.value}</strong>
      <span class="st-label">{s.label}</span>
      <small>{s.note}</small>
    </li>
  ))}
</ul>

<style lang="scss">
.stat-tiles {
  list-style: none;
  padding: 0;
  margin: 0 0 1.4em;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  li {
    background: var(--green);
    color: #fff;
    border-radius: 8px;
    padding: 20px 20px 16px;
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  strong {
    font-size: clamp(30px, 3vw, 38px);
    line-height: 1.2;
    letter-spacing: 0.01em;
  }

  .st-label {
    font-size: 15px;
    font-weight: 700;
  }

  small {
    font-size: 13px;
    line-height: 1.7;
    opacity: 0.88;
  }

  @include mobile {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
```

- [ ] **Step 5: Commit**

```bash
git add src/components/profile
git commit -m "feat: プロフィールの部品（アイコン帯・分野カード・年表・数字タイル）を追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: ページを組み立てる

**Files:**
- Modify: `src/pages/profile.astro`（全体を書き換える）

- [ ] **Step 1: profile.astro を書き換える**

```astro
---
import Base from '../layouts/Base.astro';
import Breadcrumb from '../components/Breadcrumb.astro';
import Toc from '../components/Toc.astro';
import CtaBar from '../components/CtaBar.astro';
import BadgeStrip from '../components/profile/BadgeStrip.astro';
import FieldCards from '../components/profile/FieldCards.astro';
import Milestones from '../components/profile/Milestones.astro';
import StatTiles from '../components/profile/StatTiles.astro';
import { CASES, CAREER, PRESS, WORK_URL } from '../data/profile';

// 文章はこのファイルに、数字・年表・リンクは src/data/profile.ts に置く（設計: docs/superpowers/specs/2026-10-08-profile-page-design.md）
// 公開前に本人が確認すること: IT 実績 3 件の測定条件とクライアントの承諾、年表の月
const toc = [
  { id: 'about', label: '森山貴士について' },
  { id: 'activities', label: '南相馬で取り組んできたこと' },
  { id: 'work', label: 'IT・業務改善の仕事' },
  { id: 'career', label: '経歴・受賞・外部掲載' },
];
---
<Base
  title="プロフィール"
  description="森山貴士のプロフィール。大阪市出身、2014年に南相馬市小高区へ移住。ITエンジニア・業務改善コンサルタントとして働きながら、地域拠点「アオスバシ」の運営や学びの場づくりに取り組んできました。"
  current="profile"
>
  <Breadcrumb items={[{ label: 'プロフィール' }]} />
  <section class="page-hero wrap">
    <div class="page-hero-copy">
      <p class="page-badge">プロフィール</p>
      <h1><span class="nowrap">ITの仕事と、</span><span class="nowrap">地域の「やりたい」を</span><span class="nowrap">形にする仕事を</span><span class="nowrap">してきました。</span></h1>
      <p class="page-lead">大阪市出身。2014年に南相馬市へ移住して12年。<br />ITエンジニア・業務改善コンサルタント／一般社団法人オムスビ 代表理事。</p>
    </div>
    <div class="page-hero-media"><img src="/assets/profile.webp" alt="森山貴士のプロフィール写真" class="profile-photo" /></div>
  </section>
  <div class="page-body wrap">
    <Toc items={toc} />
    <article class="prose">
      <section id="about">
        <h2>森山貴士について</h2>
        <p>南相馬市小高区で、カフェ・小売・コワーキングなどの機能を持つ地域拠点「アオスバシ」を運営しています。</p>
        <p>市内ではコーヒー屋として知っていただくことも多いのですが、本業はITエンジニア・業務改善コンサルタントです。</p>
        <p>2014年に南相馬市へ移住して以来、ITの仕事を続けながら、地域の人たちと一緒に、暮らしや交流の場づくり、子どもたちの学びの機会づくりなどに取り組んできました。</p>
        <p>移住したばかりのころは、予定していた仕事がなくなり、地域の人に小さな仕事を回してもらいながらのスタートでした。うまくいかなかったこともたくさんありますが、そのたびにやり方を考え、周りの人たちに助けてもらいながら続けてきました。</p>
        <p>仕事の分野はさまざまですが、共通しているのは、人の話を聞き、課題を整理し、実際に形にしていくことです。</p>
        <p>結婚し、子どもが産まれ、現在は一児の父です。</p>
        <p>これまで地域や企業で取り組んできたことを、今度は市政に関わる活動にも生かしていきたいと考えています。</p>
        <BadgeStrip />
      </section>
      <section id="activities">
        <h2>南相馬で取り組んできたこと</h2>
        <p>避難指示解除直後の小高で、暮らしや交流の場づくりから始めました。地域の人たちと一緒に積み重ねてきたことを、4つの分野で紹介します。</p>
        <FieldCards />
        <h3>あゆみ</h3>
        <Milestones />
      </section>
      <section id="work">
        <h2>IT・業務改善の仕事</h2>
        <p>東京のIT企業で5年、ソフトウェア開発と先端技術の研究に携わったあと、2014年からフリーランスのITエンジニア・コンサルタントとして、Webシステムの開発や企業の業務改善に取り組んでいます。コンサルティング会社のIT顧問も務めています。</p>
        <p>単にシステムをつくるだけでなく、実際の仕事がどのように進められているのかを調べ、何が課題になっているのかを整理し、よりよい仕組みを考えることを大切にしてきました。</p>
        <StatTiles />
        <h3>業務改善の実践例</h3>
        <ul class="case-list">
          {CASES.map((c) => <li><strong>{c.title}</strong><span>{c.text}</span></li>)}
        </ul>
        <p class="work-link"><a href={WORK_URL} target="_blank" rel="noopener">制作・開発の実績一覧（一般社団法人オムスビ）↗</a></p>
        <p>地域での活動とは一見違う仕事に見えるかもしれませんが、人の話を聞き、課題を整理し、実際に動く仕組みにする。その点は同じだと感じています。</p>
      </section>
      <section id="career">
        <h2>経歴・受賞・外部掲載</h2>
        <dl class="career">{CAREER.map(([k, v]) => <><dt>{k}</dt><dd>{v}</dd></>)}</dl>
        <h3>外部掲載</h3>
        <ul class="press-list">
          {PRESS.map((p) => (
            <li>
              <span class="press-outlet">{p.outlet}</span>
              <a href={p.url} target="_blank" rel="noopener">{p.title}↗</a>
              {p.date && <small>{p.date}</small>}
            </li>
          ))}
        </ul>
      </section>
      <p class="next-link"><a class="button" href="/vision/">考え方を読む <span>→</span></a></p>
    </article>
  </div>
  <CtaBar />
</Base>

<style lang="scss">
// 枠のほうが横長で上下が切れるため、頭が切れないよう上寄せにする
.profile-photo {
  object-position: center 22%;
}

// 業務改善の実践例（見出し＋一文の箇条書き）
.case-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1em;
  display: grid;
  gap: 10px;

  li {
    background: #fff;
    border: 1px solid $line;
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 15px;
    line-height: 1.8;
  }

  strong {
    display: block;
    color: var(--green);
  }
}

.work-link {
  font-size: 14px;
}

// 経歴
.career {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0;
  margin: 0 0 1.4em;

  dt,
  dd {
    padding: 12px 0;
    border-top: 1px solid $line-soft;
    margin: 0;
  }

  dt {
    font-weight: 700;
    color: $green-soft;
    padding-right: 28px;
    white-space: nowrap;
  }

  @include mobile {
    grid-template-columns: 1fr;

    dt {
      padding-bottom: 0;
    }

    dd {
      border-top: 0;
      padding-top: 4px;
    }
  }
}

// 外部掲載
.press-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.2em;
  display: grid;
  gap: 10px;

  li {
    font-size: 15px;
    line-height: 1.8;
    padding-left: 1em;
    text-indent: -1em;
  }

  small {
    margin-left: 8px;
    font-size: 13px;
    color: $muted;
  }
}

.press-outlet {
  @include pill;
  margin-right: 8px;
  text-indent: 0;
}
</style>
```

- [ ] **Step 2: ビルドが通ることを確かめる**

```bash
export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm run build 2>&1 | tail -15
```

Expected: `Complete!` で終わり、エラーがない。`.vercel/output/static/profile/index.html` ができる。

- [ ] **Step 3: 生成 HTML に 4 章と主な数字が含まれることを確かめる**

```bash
grep -o 'id="about"\|id="activities"\|id="work"\|id="career"\|年間約5,000人\|150本以上\|約100万円\|minamisoma-kosodate.net\|omsb.co/work' .vercel/output/static/profile/index.html | sort -u
```

Expected: 9 行すべて出る。

- [ ] **Step 4: Commit**

```bash
git add src/pages/profile.astro
git commit -m "feat: プロフィールページを4章構成に作り直す

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: プレビューで確かめ、README を直す

**Files:**
- Modify: `README.md`（「## ファイル」の `src/pages/` の行の近く）

- [ ] **Step 1: ビルド済みのサイトをプレビューで開く**

`preview_start` を `{ name: "site" }` で起動し（`.claude/launch.json` の `site`。`.vercel/output/static` を配信）、`/profile/` を開く。

- [ ] **Step 2: PC 幅で確かめる**

`read_page` で次を確認する。
- 目次のリンク 4 つが `#about` `#activities` `#work` `#career` を指す
- 分野カードが 4 枚、年表が 9 行、数字タイルが 3 つ、外部掲載が 5 件
- 外部リンク（子育て応援サイト、omsb.co/work、掲載記事）に `target="_blank"` がある

`computer` の screenshot で、写真が取り違えなく出ているか、数字タイルが緑の帯で目立っているかを見る。

- [ ] **Step 3: スマホ幅で確かめる**

`resize_window` を `mobile` にして screenshot。分野カードと数字タイルが 1 列、アイコン帯が 2 列、年表の年と出来事が縦に並ぶ。横スクロールが出ていない（`javascript_tool` で `document.documentElement.scrollWidth <= window.innerWidth` が `true`）。終わったら `desktop` に戻す。

- [ ] **Step 4: README に追記する**

`README.md` の「## ファイル」で `src/pages/` の行の次に 1 行足す。

```md
- `src/pages/profile.astro`: プロフィール。文章はこのファイル、数字・年表・掲載記事などの構造データは `src/data/profile.ts`（`npm test` で構造を確かめる）、部品は `src/components/profile/`。写真は `public/assets/profile/`（リーフレットから取り出したもの）。設計は `docs/superpowers/specs/2026-10-08-profile-page-design.md`
```

- [ ] **Step 5: テストとビルドを最後にもう一度通す**

```bash
export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -3
```

Expected: `fail 0`、ビルド `Complete!`。

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: README にプロフィールのデータと部品の場所を追記

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```
