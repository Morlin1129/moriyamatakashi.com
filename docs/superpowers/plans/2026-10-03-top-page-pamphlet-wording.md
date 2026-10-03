# トップページの文言をパンフレットに揃える 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** トップページの5セクションの文言を、後援会の政策パンフレット（初稿）の表現に揃える。

**Architecture:** 文言の差し替えだけで、セクション構成とレイアウトは変えない。取り組みの見出しと一文は `src/content/policies/*.yaml` の `badge` と `plain` を書き換え、トップ・パンくず・資料集のチップに一括で反映させる。他はトップ専用コンポーネントの文字列を直す。

**Tech Stack:** Astro 7、SCSS、YAML コンテンツコレクション。ビルドは nodebrew の Node v22.20.0 を使う。

設計書: `docs/superpowers/specs/2026-10-03-top-page-pamphlet-wording-design.md`

---

## 前提

ビルドは次のように Node v22.20.0 を PATH に通して実行する（どのタスクでも同じ）。

```bash
export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm run build
```

Expected: `[build] Complete!` が出て終了コード 0。

## ファイル一覧

- Modify: `src/content/policies/city-hall.yaml`（`badge`, `plain`）
- Modify: `src/content/policies/children.yaml`（`badge`, `plain`）
- Modify: `src/content/policies/economy.yaml`（`badge`, `plain`）
- Modify: `src/content/policies/odaka-kashima.yaml`（`badge`, `plain`）
- Modify: `src/content/policies/future.yaml`（`badge`, `plain`）
- Modify: `src/components/home/Hero.astro`（見出しと添え文）
- Modify: `src/components/home/Policies.astro`（セクション見出し）
- Modify: `src/components/home/Process.astro`（3ステップの文言、補足の削除）
- Modify: `src/components/home/ContactStrip.astro`（見出し）

---

### Task 1: 取り組み5つの `badge` と `plain` を書き換える

**Files:**
- Modify: `src/content/policies/city-hall.yaml:2-3`
- Modify: `src/content/policies/children.yaml:2-3`
- Modify: `src/content/policies/economy.yaml:2-3`
- Modify: `src/content/policies/odaka-kashima.yaml:2-3`
- Modify: `src/content/policies/future.yaml:2-3`

- [ ] **Step 1: 5つの YAML の2〜3行目を次に置き換える**

`city-hall.yaml`:
```yaml
badge: "良い地域は良い市役所から"
plain: "市役所の仕事をしやすくし、仕事の質を高めます"
```

`children.yaml`:
```yaml
badge: "子育てしたいと思えるまちへ"
plain: "充実した制度に加え、毎日の「ちょっと困る」を減らします"
```

`economy.yaml`:
```yaml
badge: "地元の会社が育つまちへ"
plain: "地域で頑張っている会社が成長できるよう応援します"
```

`odaka-kashima.yaml`:
```yaml
badge: "みんなの声がちゃんと届く市政へ"
plain: "「話を聞きました」で終わらせないようにします"
```

`future.yaml`:
```yaml
badge: "将来も豊かさが続くまちへ"
plain: "10年後・20年後にかかるお金まで考えます"
```

`order`・`title`・`titleLines`・`lead`・`policyName` 以下は触らない。

- [ ] **Step 2: 書き換わったことを確認する**

Run: `grep -n '^badge\|^plain' src/content/policies/*.yaml`
Expected: 10行。各ファイルに上記の `badge` と `plain` が1つずつ。

- [ ] **Step 3: ビルドが通ることを確認する**

Run: `export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm run build`
Expected: `[build] Complete!`、エラーなし。

- [ ] **Step 4: 反映先を確認する**

Run: `grep -o '良い地域は良い市役所から' dist/index.html dist/policies/city-hall/index.html dist/resources/sources/index.html | sort -u`
Expected: 3ファイルすべてに1行ずつ出る（トップ・パンくず・資料集のチップ）。

- [ ] **Step 5: コミット**

```bash
git add src/content/policies/*.yaml
git commit -m "feat: 取り組みの見出しと一文をパンフレットの表現に揃える

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: ヒーローの見出しと添え文を差し替える

**Files:**
- Modify: `src/components/home/Hero.astro:7-9`

- [ ] **Step 1: 見出しと添え文を置き換える**

変更前:
```astro
    <h1 class="hand"><span>「こうなったらいいな」を</span><br /><span>ひとつずつ。</span></h1>
    <p class="hero-name">森山貴士 <small>もりやま たかし</small></p>
    <p>大阪出身。2014年から南相馬市に移住・小高で暮らす、一児の父。<br />子育てや仕事の「不便」を、市役所と一緒に直していきます。</p>
```

変更後:
```astro
    <h1 class="hand"><span>「こうなったらいいな」を、</span><br /><span>ひとつずつ。</span></h1>
    <p class="hero-name">森山貴士 <small>もりやま たかし</small></p>
    <p>南相馬で暮らし、働き、地域の活動に関わってきました。<br />みんなの声を聞いて、できるところから変えていきます。</p>
```

- [ ] **Step 2: ビルドして文言を確認する**

Run: `export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm run build && grep -c '南相馬で暮らし、働き、地域の活動に関わってきました' dist/index.html`
Expected: ビルド成功、最後の出力が `1`。

- [ ] **Step 3: コミット**

```bash
git add src/components/home/Hero.astro
git commit -m "feat: トップのヒーローの添え文をパンフレットの表現に揃える

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 取り組みセクションの見出しを変える

**Files:**
- Modify: `src/components/home/Policies.astro:12`（見出し）と `<style>` 内の `.policies` ブロック

- [ ] **Step 1: 見出しを小見出し＋見出しにする**

変更前（12行目）:
```astro
    <h2>そのためにやりたいこと</h2>
```

変更後:
```astro
    <p class="eyebrow">取り組みたいこと</p>
    <h2>みんなの『こうしてほしい』が、ちゃんと届くまちへ</h2>
```

- [ ] **Step 2: 小見出しのスタイルを足す**

`<style lang="scss">` の `.policies { ... }` ブロックの直後に、`Voices.astro` と同じ見た目の `.eyebrow` を追加する。

```scss
.eyebrow {
  display: flex;
  align-items: center;
  gap: 22px;
  font-size: 15px;
  font-weight: 700;
  color: var(--green);
  margin-bottom: 14px;

  &:before {
    content: '';
    width: 48px;
    height: 3px;
    background: var(--green);
    border-radius: 2px;
  }
}
```

- [ ] **Step 3: ビルドして文言を確認する**

Run: `export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm run build && grep -c 'みんなの『こうしてほしい』が、ちゃんと届くまちへ' dist/index.html`
Expected: ビルド成功、最後の出力が `1`。

- [ ] **Step 4: コミット**

```bash
git add src/components/home/Policies.astro
git commit -m "feat: トップの取り組みセクションの見出しをパンフレットに合わせる

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: 進め方3ステップの文言を差し替え、補足を外す

**Files:**
- Modify: `src/components/home/Process.astro:1-30`（データとマークアップ）と `<style>` 内の `.eyebrow`

- [ ] **Step 1: ステップのデータを置き換える**

変更前（3〜7行目）:
```astro
const steps = [
  ["今をちゃんと知る", "困りごとを直接聞き、数字や資料でも確かめ、今起きていることを明らかにします", "情報をあつめてオープンにする"],
  ["橋渡しをする", "市長や職員と対立するのではなく、できるだけみんなが同じ方向を見れるように橋渡しをします", "誰かを敵にしたりおとしめない"],
  ["手を動かす", "提案して終わり、事業化されたら終わりではなく、自らの手でもできることは一緒に素早く実行します", "協力できる場所を探し一緒に進む"],
];
```

変更後:
```astro
const steps = [
  ["話を聞く・知る", "困っている人の話を聞いて、数字や資料も調べます。"],
  ["一緒に考える", "市民、会社、市役所。立場をこえて一緒に考えます。"],
  ["手を動かす", "提案するだけでなく、自分にできることは自分でもやります。"],
];
```

- [ ] **Step 2: マークアップから補足の `<p class="eyebrow">` を外す**

変更前（14〜28行目の `steps.map` の中）:
```astro
        steps.map(([title, text, eyebrow], i) => (
          <li>
            <>
              <span class="step-num">{i + 1}</span>
              <div>
              <h3>{title}</h3>
                <p class="eyebrow">{eyebrow}</p>
              <p>{text}</p>

              </div>
            </>
          </li>
        ))
```

変更後:
```astro
        steps.map(([title, text], i) => (
          <li>
            <span class="step-num">{i + 1}</span>
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        ))
```

- [ ] **Step 3: 使わなくなった `.eyebrow` のスタイルを消す**

`<style>` 内の `.step-list-top { ... }` の中にある次のブロックを削除する。

```scss
    .eyebrow {
      font-size: 10px;
      font-weight: 500;
      line-height: 1.2;
      margin-bottom: 1.5em;
    }
```

`h3` の下に本文がすぐ続くので、`h3` の `margin: 0;` を `margin-bottom: 8px;` にする。

- [ ] **Step 4: ビルドして文言を確認する**

Run: `export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm run build && grep -c '話を聞く・知る' dist/index.html && grep -c '情報をあつめてオープンにする' dist/index.html`
Expected: ビルド成功、`1` のあと `0`（grep -c が 0 のときは終了コード 1 になるが、出力が `0` なら期待どおり）。

- [ ] **Step 5: コミット**

```bash
git add src/components/home/Process.astro
git commit -m "feat: トップの進め方3ステップをパンフレットの表現に揃える

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 問い合わせの見出しを変える

**Files:**
- Modify: `src/components/home/ContactStrip.astro:6`

- [ ] **Step 1: 見出しを置き換える**

変更前:
```astro
    <h2>話を聞かせてください。</h2>
```

変更後:
```astro
    <h2>暮らしの声を、聞かせてください。</h2>
```

- [ ] **Step 2: ビルドして文言を確認する**

Run: `export PATH="$HOME/.nodebrew/node/v22.20.0/bin:$PATH" && npm run build && grep -c '暮らしの声を、聞かせてください。' dist/index.html`
Expected: ビルド成功、最後の出力が `1`。

- [ ] **Step 3: コミット**

```bash
git add src/components/home/ContactStrip.astro
git commit -m "feat: トップの問い合わせの見出しをパンフレットに合わせる

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: ブラウザで目視確認する

**Files:** なし（確認のみ）

- [ ] **Step 1: ビルド済みの `dist/` をプレビューで開く**

`.claude/launch.json` の `site` 設定（`dist/` を http.server で配信）を preview_start で起動し、トップを開く。

- [ ] **Step 2: 1280px 幅で5セクションの文言を確認する**

read_page で次がすべて見えること。
- ヒーロー: 「こうなったらいいな」を、／ひとつずつ。 と「南相馬で暮らし、働き、地域の活動に関わってきました。」
- 取り組み: 「取り組みたいこと」「みんなの『こうしてほしい』が、ちゃんと届くまちへ」と 01〜05 の新しい見出し
- 進め方: 「話を聞く・知る／一緒に考える／手を動かす」。補足の小さい文が残っていない
- 問い合わせ: 「暮らしの声を、聞かせてください。」

read_console_messages でエラーがないこと。

- [ ] **Step 3: 375px 幅で同じ確認をする**

resize_window を mobile にして同じ項目を確認し、横スクロールが出ないこと。確認後に desktop に戻す。

- [ ] **Step 4: パンくずと資料集のチップを確認する**

`/policies/odaka-kashima/` のパンくずが「みんなの声がちゃんと届く市政へ」、`/resources/sources/` のチップ5つが新しい `badge` になっていること。

- [ ] **Step 5: スクリーンショットを撮って報告する**

トップの 1280px と 375px のスクリーンショットを撮り、ユーザーに見せる。
