# トップページ入口ページ化 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** トップページを、子育て世代・現役世代向けに「誰が・何を・どうやって」が中学生でも読める5セクションの入口ページに作り替え、「進め方」を下層も含めて3つに統一する。

**Architecture:** Astro の静的サイト。取り組みは `src/content/policies/*.yaml` のコンテンツコレクションで管理し、トップ用の短い一文（`plain`）とアイコン名（`icon`）をフィールドとして追加する。トップは `src/pages/index.astro` を書き直し、アイコンは `src/components/PolicyIcon.astro` に集約する。CSS は 1 ファイル（`src/styles/global.css`、先頭行がミニファイ済み）なので、不要ルールの削除は Python スクリプトで機械的に行い、新しいスタイルは可読な形で 2〜3 行目のブロックに置き換える。

**Tech Stack:** Astro 7、Node 22.20.0（`~/.nodebrew/node/v22.20.0/bin` を PATH の先頭に足す。既定の 22.6.0 ではビルド不可）、プレビューは `.claude/launch.json` の `site`（`dist` を配信。ビルドが先）。

設計書: `docs/superpowers/specs/2026-09-24-top-page-simplify-design.md`

**テストについて:** このリポジトリにテストランナーはない。各タスクの検証は `astro build` の成否と、`dist` の HTML に対する `grep` で行う。以降の `npm run build` はすべて次の形で実行する。

```bash
PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" npm run build 2>&1 | tail -3
```

期待する末尾出力: `[build] Complete!`

---

### Task 1: 取り組み YAML に `plain` / `icon` を追加し、並び順を変える

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/policies/children.yaml`
- Modify: `src/content/policies/odaka.yaml`
- Modify: `src/content/policies/economy.yaml`
- Modify: `src/content/policies/city-hall.yaml`
- Modify: `src/content/policies/future.yaml`

- [ ] **Step 1: スキーマに `plain` と `icon` を追加する**

`src/content.config.ts` の `badge: z.string(),` の直後に 2 行を足す。

```ts
    badge: z.string(),
    plain: z.string(),
    icon: z.enum(['children', 'odaka', 'economy', 'city-hall', 'future']),
```

- [ ] **Step 2: ビルドして失敗を確認する（YAML にまだフィールドがない）**

Run: `PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" npm run build 2>&1 | grep -E "plain|icon|Required|Complete" | head`
Expected: `plain` または `icon` が Required というエラー。`Complete!` は出ない。

- [ ] **Step 3: 各 YAML に `plain` と `icon` を足し、`order` を付け直す**

各ファイルの先頭 2 行（`order:` と `badge:`）を次のように書き換える。`title` 以降は触らない。

`src/content/policies/children.yaml`
```yaml
order: 1
badge: "子どもの居場所と自然あそび"
plain: "子どもが放課後に行ける場所と、外で遊べる機会をふやす"
icon: children
```

`src/content/policies/odaka.yaml`
```yaml
order: 2
badge: "小高の買い物・医療・交通"
plain: "小高の買い物・病院・移動を、今より楽にする"
icon: odaka
```

`src/content/policies/economy.yaml`
```yaml
order: 3
badge: "地域の事業の成長"
plain: "南相馬の会社が人を増やせるよう、後押しする"
icon: economy
```

`src/content/policies/city-hall.yaml`
```yaml
order: 4
badge: "市役所の働く環境"
plain: "市役所の人が働きやすくなれば、サービスも良くなる"
icon: city-hall
```

`src/content/policies/future.yaml`
```yaml
order: 5
badge: "公共施設と財政のこれから"
plain: "古くなった建物とお金の話を、先送りせずに一緒に考える"
icon: future
```

- [ ] **Step 4: ビルドして成功と並び順を確認する**

Run:
```bash
PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" npm run build 2>&1 | tail -1 && grep -oE "取り組み 0[1-5]</small><strong>[^<]+" dist/policies/index.html
```
Expected: `Complete!` のあと、01 子育て → 02 小高 → 03 会社 → 04 市役所 → 05 施設 の順で 5 行。

- [ ] **Step 5: コミット**

```bash
git add src/content.config.ts src/content/policies
git commit -m "feat: 取り組みにトップ用の一文とアイコン名を追加し、並び順を現役世代向けに変更

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: PolicyIcon コンポーネント

**Files:**
- Create: `src/components/PolicyIcon.astro`

- [ ] **Step 1: コンポーネントを作る**

```astro
---
// トップページの取り組みリスト用の単色アイコン。name は policies の icon フィールドと対応。
interface Props { name: 'children' | 'odaka' | 'economy' | 'city-hall' | 'future' }
const { name } = Astro.props;

const paths: Record<Props['name'], string> = {
  // 子ども（人型）
  children: '<circle cx="12" cy="6" r="3"/><path d="M12 9v6M8 21l4-6 4 6M8 12h8"/>',
  // 買い物かご
  odaka: '<path d="M4 10h16l-1.5 9h-13L4 10z"/><path d="M8 10l2-5M16 10l-2-5M4 10h16"/>',
  // 伸びる棒グラフ
  economy: '<path d="M4 20v-8M10 20V8M16 20V4M3 20h18"/><path d="M13 7l3-3 3 3"/>',
  // 市役所
  'city-hall': '<path d="M3 21h18M4 21V10h16v11M8 14v4M12 14v4M16 14v4M2 10l10-6 10 6"/>',
  // 建物とお金
  future: '<path d="M3 21h11M4 21V8h9v13M7 11h3M7 15h3"/><circle cx="18" cy="16" r="3.5"/><path d="M18 14.5v3M17 16h2"/>',
};
---
<svg class="policy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" set:html={paths[name]} />
```

- [ ] **Step 2: ビルドが通ることを確認する**

Run: `PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" npm run build 2>&1 | tail -1`
Expected: `Complete!`（まだどこからも使っていないので出力は変わらない）

- [ ] **Step 3: コミット**

```bash
git add src/components/PolicyIcon.astro
git commit -m "feat: 取り組みアイコンの PolicyIcon コンポーネントを追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 「私の考え方」ページの進め方を 3 つにする

**Files:**
- Modify: `src/pages/vision.astro:11`（目次ラベル）
- Modify: `src/pages/vision.astro:49-60`（process セクション）
- Modify: `src/layouts/Base.astro:12`（既定の description）

- [ ] **Step 1: 目次ラベルを直す**

`src/pages/vision.astro` の
```ts
  { id: 'process', label: '大切にする、5つの進め方' },
```
を
```ts
  { id: 'process', label: '大切にする、3つの進め方' },
```
にする。

- [ ] **Step 2: process セクションを 3 ステップに書き換える**

`<section id="process">` から `</section>` までを、次の内容に丸ごと置き換える。

```html
      <section id="process">
        <h2>大切にする、3つの進め方</h2>
        <p>どの政策でも、要望を聞いて事業をつくり、「実施した」で終わらせたくありません。次の進め方を、行政と地域の当たり前にしていきたいです。</p>
        <ol class="step-list">
          <li><h3>聞いて、調べる</h3><p>現場で困りごとを聞きます。声の大きさだけで判断せず、言葉になっていない不便や、少数の人が抱える大切な課題も拾います。そのうえで、利用状況や費用などのデータと当事者の経験を照らし合わせ、何が問題なのかを明らかにします。</p></li>
          <li><h3>一緒に考える</h3><p>市民、事業者、地域団体、行政職員など、関わる人が早い段階から参加し、複数の方法と必要な費用を比べます。</p></li>
          <li><h3>小さく試して、結果を伝える</h3><p>最初から大きな事業を決めず、小さく始めて、需要や運営上の課題を確かめます。何が良くなり、何がうまくいかなかったかを共有し、市民の声を聞き直して方法を変え、良い取り組みを広げます。</p></li>
        </ol>
        <p>この流れを担当者個人の頑張りだけに頼らず、記録を残して次の仕事に活かせる仕組みにしたいです。</p>
      </section>
```

- [ ] **Step 3: サイト既定の description をヒーローの新しい言葉に合わせる**

`src/layouts/Base.astro` の
```ts
const DEFAULT_DESCRIPTION = '現場から、南相馬のこれからを。市民の声を聞き、事実を確かめ、暮らしの改善につなげるための取り組み。';
```
を
```ts
const DEFAULT_DESCRIPTION = '困りごとを、放っておかない。南相馬・小高で暮らす一児の父、森山貴士が、子育てや仕事の「不便」を市役所と一緒に直していくための取り組み。';
```
にする。

- [ ] **Step 4: ビルドして「5つの進め方」が消えたことを確認する**

Run:
```bash
PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" npm run build 2>&1 | tail -1 && grep -c "5つの進め方" dist/vision/index.html; grep -c "3つの進め方" dist/vision/index.html; grep -c "<li><h3>" dist/vision/index.html
```
Expected: `Complete!` / `0` / `2`（目次と見出し） / `6`（action-list 3 + step-list 3）

- [ ] **Step 5: コミット**

```bash
git add src/pages/vision.astro src/layouts/Base.astro
git commit -m "feat: 進め方を5つから3つに統一し、サイト説明文を新しいヒーローに合わせる

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: トップページを 5 セクションで書き直す

**Files:**
- Modify: `src/pages/index.astro`（全体を置き換え）

- [ ] **Step 1: index.astro を次の内容で丸ごと置き換える**

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import PolicyIcon from '../components/PolicyIcon.astro';

const policies = (await getCollection('policies')).sort((a, b) => a.data.order - b.data.order);

const voices = [
  '意見交換会で声を上げても、届いている気がしない',
  '地域に不満はない。でも休みの日は、つい市外に遊びに行ってしまう',
  '新しい会社の誘致は熱心だけど、ここで根を張ってやる人への応援が少ない',
];

const steps = [
  ['聞いて、調べる', '困りごとを直接聞き、数字や資料でも確かめます。'],
  ['一緒に考える', '関わる人と早い段階から、やり方と費用をくらべます。'],
  ['小さく試して、結果を伝える', 'できるところから始め、良かった点も課題も伝えて次に活かします。'],
];
---
<Base subpage={false}>
  <section class="hero">
    <img src="/assets/hero.jpg" alt="地域の人とカフェで話す場面のイメージ" class="hero-photo" fetchpriority="high" />
    <div class="hero-shade"></div>
    <div class="hero-copy">
      <h1 class="hand"><span>困りごとを、</span><br /><span>放っておかない。</span></h1>
      <p class="hero-name">森山貴士 <small>もりやま たかし</small></p>
      <p>大阪出身。2014年から南相馬・小高で暮らす、一児の父。<br />子育てや仕事の「不便」を、市役所と一緒に直していきます。</p>
      <a class="button" href="/profile/">くわしいプロフィール <span>→</span></a>
    </div>
  </section>

  <section id="voices" class="voices">
    <div class="wrap">
      <h2>こんな声を、聞いてきました。</h2>
      <ul class="voice-list">
        {voices.map((voice) => <li>「{voice}」</li>)}
      </ul>
      <p class="voices-close">こうした声を、放っておきたくない。<br />ひとつずつ、形にしていきます。</p>
    </div>
  </section>

  <section id="policies" class="policies">
    <div class="wrap">
      <h2>だから、これをやります。</h2>
      <ol class="plain-list">
        {policies.map((p) => (
          <li>
            <a href={`/policies/${p.id}/`}>
              <PolicyIcon name={p.data.icon} />
              <span>{p.data.plain}</span>
              <span class="plain-arrow" aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ol>
      <p class="small-link"><a href="/resources/">数字や資料で見る →</a></p>
    </div>
  </section>

  <div class="landscape">
    <img src="/assets/landscape.jpg" alt="緑に囲まれた地方のまちのイメージ" loading="lazy" />
  </div>

  <section id="process" class="process">
    <div class="wrap">
      <h2>どうやって進めるの？</h2>
      <ol class="step-list-top">
        {steps.map(([title, text], i) => (
          <li><span class="step-num">{i + 1}</span><h3>{title}</h3><p>{text}</p></li>
        ))}
      </ol>
      <p class="small-link"><a href="/vision/">くわしい考え方 →</a></p>
    </div>
  </section>

  <section class="contact-strip">
    <div class="wrap">
      <h2>話を聞かせてください。</h2>
      <button class="button" data-open="contact">お問い合わせ・ご意見 <span>→</span></button>
      <p class="hand">小さな声から、<br />大きな一歩へ。</p>
    </div>
  </section>
</Base>
```

- [ ] **Step 2: ビルドして dist の内容を確認する**

Run:
```bash
PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" npm run build 2>&1 | tail -1
for w in "放っておかない" "一児の父" "こんな声を" "だから、これをやります" "どうやって進めるの" "話を聞かせてください" 'href="/policies/children/"' 'class="policy-icon"' "数字や資料で見る" "くわしい考え方"; do printf "%s: " "$w"; grep -c "$w" dist/index.html; done
for w in "考え方を読む" "資料集を見る" "まちを考えるノート" "森山貴士について" "現場から"; do printf "%s: " "$w"; grep -c "$w" dist/index.html; done
```
Expected: 前半はすべて 1 以上（`policy-icon` は 5）。後半はすべて 0。

- [ ] **Step 3: コミット**

```bash
git add src/pages/index.astro
git commit -m "feat: トップページを5セクションの入口ページに書き直す

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: CSS を整理する（不要ルールの削除と新セクションのスタイル）

**Files:**
- Modify: `src/styles/global.css`（1行目・3行目・43行目・45行目のミニファイ済みルール、2〜3行目のブロック）

背景: `global.css` の 1 行目は約 10,000 文字のミニファイ済みルール、43〜45 行目は `@media` ブロック。手で編集すると壊しやすいので、削除は Python で行う。削除対象は「トップページでしか使っていないクラス」。下層で使う `.crop`、`.step-list`、`.policy-card`、`.policy-list`、`.badge`、`.paper`、`.bars`、`.rings`、`.ring`、`.resource-art`、`.note-small`、`.button`、`.wrap`、`.hand` は残す。

- [ ] **Step 1: 削除前の状態を記録する**

Run: `wc -c src/styles/global.css && grep -o "\.vision-copy{" src/styles/global.css | wc -l`
Expected: バイト数（後で比較用）/ `2`

- [ ] **Step 2: 不要ルールを Python で削除する**

プロジェクト直下で次を実行する（スクラッチ用の一時スクリプト。リポジトリには残さない）。

```bash
python3 - <<'EOF'
import re
p = 'src/styles/global.css'
lines = open(p, encoding='utf-8').read().split('\n')

# 削除するセレクタの先頭パターン（正規表現、セレクタ先頭に一致）
DROP = [
    r'\.vision', r'\.section-top', r'\.section-heading', r'\.underline', r'\.text-link', r'\.more-link',
    r'\.policy-grid', r'\.policy(?![-\w])', r'\.policy-tag', r'\.policy-sub', r'\.short-rule',
    r'\.policies', r'\.landscape(?![-\w])', r'\.process(?![-\w])', r'\.process-inner',
    r'\.step(?![-\w])', r'\.step-icon', r'\.step-num', r'\.step-arrow',
    r'\.resources', r'\.resource-intro', r'\.resource-card(?![-\w])', r'\.outline',
    r'\.profile', r'\.notes', r'\.note(?![-\w])', r'\.contact-strip', r'\.hero-note', r'\.mobile',
]
drop_re = re.compile('^(?:' + '|'.join(DROP) + ')')

def keep_rule(selector):
    parts = [s.strip() for s in selector.split(',')]
    return not all(drop_re.match(s) for s in parts)

def strip(line):
    # ルール単位で走査。@media(...){ の接頭辞は [^{}]+\{ に含まれないので、
    # 削除しても line[pos:m.start()] でそのまま残る。
    out, pos = [], 0
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', line):
        out.append(line[pos:m.start()])
        if keep_rule(m.group(1)):
            out.append(m.group(0))
        pos = m.end()
    out.append(line[pos:])
    return ''.join(out)

for i in (0, 42, 44):  # 1行目, 43行目, 45行目
    lines[i] = strip(lines[i])
open(p, 'w', encoding='utf-8').write('\n'.join(lines))
print('done')
EOF
```

- [ ] **Step 3: 削除結果を確認する**

Run:
```bash
for s in ".vision-copy{" ".policy-grid{" ".resources{" ".profile{" ".notes{" ".note img" ".contact-strip{" ".hero-note{" ".step-arrow{" ".process-inner{" ".landscape p{" ".mobile{"; do printf "%s: " "$s"; grep -c -F "$s" src/styles/global.css; done
for s in ".crop{" ".step-list li" ".policy-card{" ".badge{" ".paper{" ".ring{" ".resource-art{" ".hero{" ".hero-copy{" ".hand{" "@media(min-width:1500px){.hero{height:760px}}"; do printf "%s: " "$s"; grep -c -F "$s" src/styles/global.css; done
```
Expected: 前半はすべて `0`。後半はすべて `1` 以上。

もし後半に `0` があれば `git checkout src/styles/global.css` で戻し、`DROP` の該当パターンを見直してから Step 2 をやり直す。

- [ ] **Step 4: 2〜3 行目のブロックを新しいトップページ用スタイルに置き換える**

`src/styles/global.css` の 2 行目（`/* トップページ：リンク化したカード */`）と 3 行目（`.policy,.note{display:block}...`）を削除し、代わりに次のブロックを同じ位置に入れる。

```css
/* トップページ */
.hero-copy{max-width:640px}
.hero-copy .hero-name{font-size:22px;font-weight:700;margin-bottom:10px;text-shadow:0 1px 4px #0009}
.hero-name small{font-size:14px;font-weight:500;margin-left:6px}
.voices,.policies,.process{padding:var(--section-pad) 0}
.voices h2,.policies h2,.process h2,.contact-strip h2{font-size:clamp(24px,2.4vw,32px);margin-bottom:28px}
.voice-list{list-style:none;padding:0;margin:0 0 28px;display:grid;gap:14px;max-width:760px}
.voice-list li{background:#fff;border-left:4px solid var(--green);border-radius:4px;padding:16px 20px;font-size:17px;line-height:1.8;box-shadow:0 2px 10px #20492b0f}
.voices-close{font-size:17px;line-height:1.9;font-weight:600}
.policies{position:relative;background:linear-gradient(130deg,#edf2e7,#deeadb);clip-path:polygon(0 0,25% 1.2%,60% 0,100% 1.5%,100% 100%,0 100%)}
.plain-list{list-style:none;padding:0;margin:0;display:grid;gap:12px;max-width:760px}
.plain-list a{display:grid;grid-template-columns:48px 1fr 24px;align-items:center;gap:16px;background:#fffdf8;border-radius:8px;padding:16px 20px;font-size:17px;font-weight:600;line-height:1.7;color:var(--ink);text-decoration:none;transition:transform .2s,box-shadow .2s}
.plain-list a:hover{transform:translateY(-2px);box-shadow:0 8px 20px #20492b18}
.policy-icon{width:48px;height:48px;color:var(--green)}
.plain-arrow{color:var(--green);font-size:20px}
.small-link{margin-top:24px;font-size:15px}
.small-link a{color:var(--green);border-bottom:1px solid #b3c5b6}
.landscape{height:250px;position:relative;overflow:hidden;clip-path:polygon(0 8%,12% 4%,25% 8%,45% 0,64% 4%,83% 2%,100% 6%,100% 100%,0 100%)}
.landscape img{height:100%;object-position:50% 58%}
.process{background:linear-gradient(120deg,#204735,#285842);color:#fff}
.step-list-top{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
.step-list-top li{display:grid;grid-template-columns:40px 1fr;column-gap:14px;row-gap:6px;align-items:start}
.step-num{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#fff;color:var(--green);font-weight:700;font-size:18px;grid-row:span 2}
.step-list-top h3{font-size:19px;line-height:1.6;margin:6px 0 0}
.step-list-top p{font-size:15px;line-height:1.8;color:#ecf2e9}
.process .small-link a{color:#dfeadf;border-color:#7f9a86}
.contact-strip{background:linear-gradient(110deg,#e1ebd8,#f2f5e9,#dce8d3);padding:calc(var(--section-pad)*.6) 0}
.contact-strip>.wrap{display:flex;align-items:center;justify-content:space-between;gap:25px}
.contact-strip h2{margin:0}
.contact-strip .hand{font-size:23px;transform:rotate(-4deg)}
@media(max-width:760px){
.voices h2,.policies h2,.process h2,.contact-strip h2{font-size:24px;margin-bottom:20px}
.voice-list li{font-size:15px;padding:14px 16px}
.voices-close{font-size:15px}
.plain-list a{grid-template-columns:40px 1fr 20px;gap:12px;padding:14px 16px;font-size:15px}
.policy-icon{width:40px;height:40px}
.landscape{height:180px}
.step-list-top{grid-template-columns:1fr;gap:22px}
.contact-strip>.wrap{flex-direction:column;align-items:flex-start;gap:23px}
.contact-strip .hand{display:none}
.contact-strip .button{width:100%}
}
```

- [ ] **Step 5: ビルドしてスタイルが出力に含まれることを確認する**

Run:
```bash
PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" npm run build 2>&1 | tail -1 && grep -l "step-list-top" dist/_astro/*.css | head -1 && grep -c "vision-copy" dist/_astro/*.css
```
Expected: `Complete!` / CSS ファイルのパス 1 件 / `0`

- [ ] **Step 6: ブラウザで確認する**

`preview_start` で `site` を起動し、次を確認する。

1. `/` PC 幅（1280px）: 5 セクションが順に表示され、取り組みリスト 5 行にアイコンが出る。コンソールにエラーなし。
2. `/` スマホ幅（375px）: 横スクロールなし。取り組みリストと 3 ステップが 1 列になる。
3. `/policies/`: カード表示が崩れていない（`.policy-card` が残っている）。
4. `/resources/`: 3 枚のカードのアート（紙・棒グラフ・輪）が崩れていない。
5. `/vision/`: 3 ステップの `.step-list` の縦線と番号が崩れていない。

崩れがあれば、該当クラスが Step 2 で消えていないか `grep -c -F ".クラス名{" src/styles/global.css` で確かめ、消えていれば Step 4 のブロックに追記して直す。

- [ ] **Step 7: コミット**

```bash
git add src/styles/global.css
git commit -m "style: トップページの不要スタイルを削除し、新セクションのスタイルを追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 最終確認と PR

**Files:** なし（確認のみ）

- [ ] **Step 1: クリーンビルド**

Run: `rm -rf dist && PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" npm run build 2>&1 | tail -2`
Expected: `12 page(s) built` と `Complete!`

- [ ] **Step 2: 消したはずの文言が残っていないか全ページを確認**

Run: `grep -rl "5つの進め方\|現場から、南相馬のこれからを" dist || echo "none"`
Expected: `none`

- [ ] **Step 3: 取り組みページの前後リンクが新しい順になっているか確認**

Run: `grep -oE 'href="/policies/[a-z-]+/"' dist/policies/children/index.html | sort -u`
Expected: `odaka`（次）は含まれ、`city-hall` は含まれない（children が 1 番目なので前はない）。

- [ ] **Step 4: プッシュして PR を作る**

```bash
git push -u origin claude/top-page-simplify
gh pr create --base main --title "feat: トップページを現役世代向けの入口ページに作り替える" --body-file - <<'EOF'
## 概要
トップページを、子育て世代・現役世代が中学生レベルの言葉で「誰が・何を・どうやって」を読み取れる入口ページに作り替えました。下層ページの情報量は変えていません。

設計書: docs/superpowers/specs/2026-09-24-top-page-simplify-design.md

## 変更内容
- トップを 5 セクションに再構成（ヒーロー／こんな声を聞いてきました／だから、これをやります／どうやって進めるの？／話を聞かせてください）
- 「考え方」「資料と数字」「ノート」「プロフィール」セクションをトップから外し、下層へのリンクに置き換え
- 取り組み YAML に `plain`（トップ用の一文）と `icon` を追加し、並び順を 子ども → 小高 → 会社 → 市役所 → 施設とお金 に変更（一覧ページと前後リンクも同じ順になります）
- 「進め方」を 5 つから 3 つに統一（トップと「私の考え方」ページ）
- サイト既定の description を新しいヒーローの言葉に更新
- トップ専用の不要 CSS を削除

## 確認
- `astro build` 成功
- PC 幅・スマホ幅でトップを表示確認、`/policies/` `/resources/` `/vision/` の表示崩れなし

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```
