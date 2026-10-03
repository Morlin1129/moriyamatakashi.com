# お問い合わせと後援会入会申し込み 設計

日付: 2026-10-03

## 目的

サイトの「お問い合わせ」を、実際にメールが届くフォームにする。あわせて、後援会への入会申し込みを受け付けるページをつくる。どちらも Resend でメールを送り、本人のメールアドレスに届く。

## 前提（調査で分かったこと）

- サイトは Vercel で公開されている（`moriyamatakashi.com` の応答ヘッダが `server: Vercel`。リポジトリの homepage は `moriyamatakashi-com.vercel.app`）。README の「公開は未設定」は古い。
- 現状は `output: 'static'` でアダプタなし。問い合わせは「準備中」ダイアログだけで、フォームも送信処理もない。
- Resend には送信ドメイン（`moriyamatakashi.com`）を設定済み。
- 迷惑投稿対策に Cloudflare Turnstile を使う（本人が Cloudflare でウィジェットを作り、サイトキーとシークレットキーを得る）。

## 方針

- `@astrojs/vercel` アダプタを入れ、`output: 'static'` は変えない。`src/pages/api/contact.ts` だけ `prerender = false` にしてサーバーレス関数にする。他のページは今までどおり静的。
- Resend は SDK を入れず、REST API（`POST https://api.resend.com/emails`）を `fetch` で呼ぶ。依存を増やさない。
- API キー・送信先・送信元・Turnstile のキーはコードに書かず、環境変数で渡す。ローカルは `.env`（Git 対象外）。
- お問い合わせと入会申し込みは同じ API を使い、`kind` で分ける。検証とメール本文の組み立ては純粋関数 `src/lib/contact.mjs` に置き、`npm test` で確かめる。
- メールは本文テキストのみ（HTML は使わない）。差出人のメールアドレスを `reply_to` に入れ、届いたメールにそのまま返信できるようにする。
- 自動返信（控えメール）は送らない。
- サイトの文章は断定を避ける。後援会の案内文は仮の短い文にし、名称・会費は書かない（本人から文面をもらったら差し替える）。

## 環境変数

| 変数 | 置き場所 | 内容 |
|---|---|---|
| `RESEND_API_KEY` | サーバー（秘密） | Resend の API キー |
| `CONTACT_TO` | サーバー（秘密） | 受け取るメールアドレス |
| `CONTACT_FROM` | サーバー（秘密） | 送信元。`森山貴士 ウェブサイト <contact@moriyamatakashi.com>` の形。Resend で検証済みのドメインであること |
| `TURNSTILE_SITE_KEY` | クライアント（公開） | Turnstile のサイトキー。`astro:env` の schema で宣言し、ビルド時に埋め込む |
| `TURNSTILE_SECRET_KEY` | サーバー（秘密） | Turnstile のシークレットキー |

秘密の値は `astro:env/server` の `getSecret()` で実行時に読む（schema に宣言せず、未設定なら API が 500 と分かりやすいメッセージを返す）。`.env.example` に変数名と Turnstile のテスト用キー（常に通るキー `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`）を書き、ローカルで動かせるようにする。

Vercel 側では、本人が Project Settings → Environment Variables に上の 5 つを設定する。Turnstile のウィジェットには `moriyamatakashi.com`・`www.moriyamatakashi.com`・`moriyamatakashi-com.vercel.app` をホスト名として登録する。

## API: `POST /api/contact/`

`src/pages/api/contact.ts`（`prerender = false`）。`multipart/form-data` または `application/x-www-form-urlencoded` を受け取り、JSON を返す。

入力（共通）:

- `kind`: `inquiry`（お問い合わせ）か `membership`（入会申し込み）
- `cf-turnstile-response`: Turnstile のトークン
- `website`: ハニーポット。画面では見えない欄。値があれば、送らずに成功として返す（ボットに学習させない）

入力（`inquiry`）: `name`（必須）、`email`（必須、形式を確認）、`phone`（任意）、`subject`（任意）、`message`（必須）

入力（`membership`）: `name`（必須）、`kana`（必須）、`postal`（任意、7 桁。ハイフンは取り除く）、`address`（必須）、`phone`（任意）、`email`（任意、形式を確認）。`phone` と `email` のどちらかは必須。

処理の順:

1. 本文を読み、`kind` を確かめる。不明なら 400。
2. ハニーポットに値があれば 200 `{ ok: true }` を返して終わる。
3. `validateSubmission(kind, fields)` で検証。失敗なら 400 `{ ok: false, errors: { field: message } }`。
4. Turnstile を `siteverify` で確かめる。失敗なら 400 `{ ok: false, message: '確認に失敗しました。もう一度お試しください。' }`。
5. `buildMail(kind, values)` で件名と本文を作り、Resend に送る。失敗なら 502 `{ ok: false, message: '送信できませんでした。時間をおいてお試しください。' }`。
6. 成功なら 200 `{ ok: true }`。

環境変数が足りないときは 500 で、どの変数が足りないかをメッセージに含める（運用者が気づけるように。利用者の画面には一般的な文言だけ出す）。

各欄の長さに上限を置く（名前など 100 文字、住所 200 文字、本文 5000 文字）。長すぎれば 400。

## メールの形

- 件名: お問い合わせは `【お問い合わせ】<件名、なければ「件名なし」>（<名前>）`、入会は `【後援会 入会申し込み】<名前>`
- 本文: 項目を「ラベル: 値」で並べ、最後に「送信日時（日本時間）」を付ける。本文は `message` を改行そのままで載せる。
- `reply_to`: `email` があればそれ。なければ付けない。

## 画面

### お問い合わせダイアログ（`src/components/layout/ContactDialog.astro`）

今の「準備中」の文章をフォームに置き換える。見出し「お問い合わせ・ご意見」。項目: お名前、メールアドレス、電話番号（任意）、件名（任意）、内容。下に Turnstile のウィジェット、送信ボタン、結果の表示欄（`aria-live="polite"`）。送信中はボタンを無効にし、成功したらフォームを隠して「送信しました。内容を確認のうえ、返信が必要なものにはご連絡します。」と出す。失敗したら欄の下に理由を出し、Turnstile を `turnstile.reset()` で出し直す。個人情報の扱いは「いただいた内容は本人が確認し、返信と連絡のためにだけ使います。」の一文を添える。

### 後援会ページ（`src/pages/supporters.astro`、URL `/supporters/`）

下層ページの型（`profile.astro` と同じ骨組み。パンくず、`page-hero`、`page-body`、`prose`、`CtaBar`）。目次は「後援会について」「入会申し込み」。

- 「後援会について」: 仮の短い文（活動を応援してくださる方の申し込みを受け付けていること、申し込み後に本人から連絡すること）。会費や名称は書かない。
- 「入会申し込み」: フォーム。項目: お名前、ふりがな、郵便番号（任意）、住所、電話番号、メールアドレス（電話かメールのどちらかは必須、と明記）。Turnstile、送信ボタン、結果の表示欄。個人情報の一文を添える。

### 誘導

- `src/data/site.ts` の `NAV` に `{ key: 'supporters', label: '後援会', href: '/supporters/' }` を加える（ヘッダー・フッターに出る）。`NavKey` も増やす。
- トップの `ContactStrip` に「後援会への入会申し込みはこちら」のリンクを添える。

### 共通の部品

- `src/components/ContactForm.astro`: フォームの共通部分（Turnstile のウィジェット、ハニーポット、送信ボタン、結果欄）を slot で囲む。`kind` と成功時の文言を props で受け取る。Turnstile のスクリプト読み込みはここで行う（`async defer`）。
- `src/scripts/contact-form.js`: `form[data-contact]` を対象に、submit を横取りして `fetch` で送り、結果を表示する。`Base.astro` から読み込む `site.js` に足すのではなく、別ファイルにして ContactForm 側で読み込む。
- `src/styles/components/_form.scss`: 入力欄・ラベル・エラー文・結果欄のスタイル。`global.scss` から `@use`。フォーカスリングは既存（金色の outline）に合わせる。

JavaScript が切れていると送れないが、ダイアログを開くこと自体が JS 前提なので、`<noscript>` の注意書きは置かない。

## テスト

- `tools/contact.test.mjs`（`node --test`）: `validateSubmission` の必須・形式・長さ・「電話かメールのどちらか」・郵便番号の正規化、`buildMail` の件名と本文、`reply_to` の有無。
- 手元の確認: `.env` にテスト用の Turnstile キーと（本人が用意した）Resend のキーを置き、`npm run dev` でフォームから送って届くことを見る。Resend のキーがない状態では、API が 500 で「RESEND_API_KEY が未設定」と返すことまでを確かめる。
- `npm run build` が通ること。アダプタを入れると出力先が `.vercel/output/` になるため、`.claude/launch.json` の静的プレビューはその `static` を見るように直し、フォームの確認は `npm run dev` で行う旨を README に書く。

## 変更するファイル

| ファイル | 変更 |
|---|---|
| `package.json` | `@astrojs/vercel` を追加 |
| `astro.config.mjs` | `adapter: vercel()` と `env.schema`（`TURNSTILE_SITE_KEY`） |
| `.gitignore` / `.env.example` | `.env` を除外、変数名の見本 |
| `src/lib/contact.mjs` / `tools/contact.test.mjs` | 検証とメール組み立て、テスト |
| `src/pages/api/contact.ts` | API |
| `src/components/ContactForm.astro` / `src/scripts/contact-form.js` / `src/styles/components/_form.scss` | フォーム共通部品 |
| `src/components/layout/ContactDialog.astro` | フォームに置き換え |
| `src/pages/supporters.astro` | 後援会ページ |
| `src/data/site.ts` / `src/components/home/ContactStrip.astro` | 誘導 |
| `README.md` / `tools/README.md` / `.claude/launch.json` | 説明と設定の更新 |

## やらないこと

- 自動返信、送信内容の保存（データベース）、管理画面。
- 送信回数の制限（Turnstile で足りるとみる）。
- 後援会の正式な案内文（文面をもらってから）。
