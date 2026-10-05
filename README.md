# moriyamatakashi.com

森山貴士のウェブサイト。[Astro](https://astro.build/) で作った静的サイトです。

## 開発

Node.js 22.12 以上が必要です（`.node-version` を参照）。

```sh
npm install
npm run dev
```

http://localhost:4321 を開いてください。

## ビルド

```sh
npm run build
```

`.vercel/output/` に出力されます（Vercel 用の形。Git には含めていません）。静的ファイルは `.vercel/output/static/`、お問い合わせの API は `.vercel/output/functions/` です。

## お問い合わせ・後援会入会申し込み

お問い合わせダイアログ（全ページ）と後援会ページ（`/supporters/`）のフォームは、`/api/contact/`（`src/pages/api/contact.ts`。この 1 つだけ Vercel の関数として動く）に送られ、[Resend](https://resend.com/) でメールになります。迷惑投稿対策は [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) とハニーポット。設計は `docs/superpowers/specs/2026-10-03-contact-form-design.md`。

動かすには次の環境変数が要ります（`.env.example` を参照。ローカルは `.env` にコピー、本番は Vercel の Project Settings → Environment Variables）。

- `RESEND_API_KEY`: Resend の API キー
- `CONTACT_TO`: 受け取るメールアドレス
- `CONTACT_FROM`: 送信元（Resend で検証済みのドメインのアドレス）
- `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`: Turnstile のキー。ローカルは `.env.example` にあるテスト用キー（必ず通る）でよい
- `GA_MEASUREMENT_ID`: Google アナリティクス 4 の測定 ID（`G-` で始まる）。設定したときだけ `Base.astro` が計測スクリプトを読み込む。Vercel では Production にだけ設定する（プレビューの閲覧を混ぜない）

フォームの動作確認は `npm run dev` で行ってください（静的ファイルだけを配信するサーバーでは API が動きません）。

## ファイル

- `src/layouts/Base.astro`: 全ページ共通のヘッダー・フッター・お問い合わせダイアログ
- `src/pages/supporters.astro`: 後援会のページと入会申し込みフォーム
- `src/pages/privacy.astro`: プライバシーポリシー。フッターと各フォームからリンク。外部サービスを増減したらここも直す（設計は `docs/superpowers/specs/2026-10-03-privacy-policy-design.md`）
- `src/pages/api/contact.ts`: お問い合わせ・入会申し込みの送信先 API。入力の検証とメール本文は `src/lib/contact.mjs`（`npm test` で確かめる）、画面の文言は `src/data/contact.ts`
- `src/components/form/`: フォームの共通部品（`ContactForm.astro` が枠、`FormField.astro` が欄）。送信処理は `src/scripts/contact-form.js`
- `src/pages/`: 各ページ（`index` トップ、`vision` 考え方、`resources` 資料と数字、`profile` プロフィール、`policies/` 取り組み）
- `src/content/policies/*.yaml`: 取り組み5つの内容。**取り組みの文章・資料リンクを直すときはここだけ編集**すれば、個別ページ・一覧・トップのカード・資料集の一覧に反映されます
- `src/pages/apps/tax.astro`: ミニアプリ「税金はどこへ行った？ 南相馬版」。決算データは `src/data/kessan-r6.json`
- `src/pages/apps/health.astro`: ミニアプリ「まちの健康診断」。2008〜2024年度の決算カードから抜き出した `src/data/kessan-timeseries.json`（南相馬市の推移）と `src/data/kessan-compare.json`（県内7市の比較）を使う（グラフは `src/components/MiniChart.astro` と `CompareBars.astro`）
- `src/pages/apps/odaka.astro`: ミニアプリ「小高 復興のあゆみ」。年表は `src/data/odaka-timeline.json`、主要事業は `src/data/odaka-projects.json`、数字は `src/data/odaka-numbers.json`（年表は `src/components/Timeline.astro`、事業カードは `ProjectCard.astro`、型は `src/data/odaka-types.ts`）。**中身を直すときは JSON だけ編集**し、`npm test` で構造を確かめる
- `src/pages/apps/questions.astro`: ミニアプリ「一般質問 みんなの論点」。データは `src/data/questions.json`（定例会・議員・質問）と `src/data/questions-analysis.json`（分野ごとの主要トピック）、分野・方向性の対応表は `src/data/questions-meta.json`、集計は `src/lib/questions-stats.mjs`。**中身を直すときは JSON だけ編集**し、`npm test` で構造を確かめる。市議会だよりと一般質問件名表の PDF は `gikai/`（Git 対象外）に置いて読む
- `src/components/`: パンくず、目次、資料カード、ご意見バー
- `src/styles/global.css`: 配色、レイアウト、スマートフォン対応
- `src/scripts/site.js`: メニュー、お問い合わせダイアログの開閉、資料集の絞り込み
- `public/assets/`: 写真とデザイン素材

## 取り組みを追加・編集する

`src/content/policies/` に YAML を1つ置くと、`/policies/<ファイル名>/` のページができます。項目は `src/content.config.ts` のスキーマを参照してください。`order` が表示順、`badge` がラベル、`resources` が関連する資料です。

## 試作段階の項目

写真はAI生成の仮素材です。資料集は市の公開資料へのリンク一覧まで。ミニアプリは「税金はどこへ行った？」（税額は概算）と「まちの健康診断」（総務省の決算カードをPDFから機械的に読み取ったもの）、「小高 復興のあゆみ」（公開資料から書き起こした年表。資料未確認の項目を含む）、「一般質問 みんなの論点」（市議会だよりの要約から書き起こし、議会だよりに載っていない件名と「その他の質問」は一般質問件名表の件名・要旨から質問の側だけをまとめたもの。分野・方向性はAIによる分類）を試作版として公開しています。公開前に本人の写真と確定した情報へ差し替えてください。

`reference.jpg` は取り組みカードの写真領域をCSSで表示するために使用しています。

## 公開

Vercel で公開しています（https://www.moriyamatakashi.com/）。`main` への push で Vercel が自動でビルド・公開します。お問い合わせを動かすには、上の環境変数を Vercel 側に設定しておく必要があります。
