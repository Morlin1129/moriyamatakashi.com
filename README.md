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

`dist/` に静的ファイルが出力されます。公開対象はこの `dist/` です（Gitには含めていません）。

## ファイル

- `src/layouts/Base.astro`: 全ページ共通のヘッダー・フッター・お問い合わせダイアログ
- `src/pages/`: 各ページ（`index` トップ、`vision` 考え方、`resources` 資料と数字、`profile` プロフィール、`policies/` 取り組み）
- `src/content/policies/*.yaml`: 取り組み5つの内容。**取り組みの文章・資料リンクを直すときはここだけ編集**すれば、個別ページ・一覧・トップのカード・資料集の一覧に反映されます
- `src/components/`: パンくず、目次、資料カード、ご意見バー
- `src/styles/global.css`: 配色、レイアウト、スマートフォン対応
- `src/scripts/site.js`: メニュー、お問い合わせダイアログ、資料集の絞り込み
- `public/assets/`: 写真とデザイン素材

## 取り組みを追加・編集する

`src/content/policies/` に YAML を1つ置くと、`/policies/<ファイル名>/` のページができます。項目は `src/content.config.ts` のスキーマを参照してください。`order` が表示順、`badge` がラベル、`resources` が関連する資料です。

## 試作段階の項目

写真はAI生成の仮素材です。資料集は市の公開資料へのリンク一覧まで、ミニアプリは構想の説明のみで、実データの表示・計算は未実装です。お問い合わせ先は未設定で、送信機能はありません。公開前に本人の写真と確定した情報へ差し替えてください。

`reference.jpg` は取り組みカードの写真領域をCSSで表示するために使用しています。

## 公開

このリポジトリへのpushによる自動公開は設定していません。
