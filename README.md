# moriyamatakashi.com

森山のウェブサイト試作。緑のB案をもとにした、HTML・CSS・JavaScriptの静的サイトです。

## ローカルで確認

```sh
python3 -m http.server 8000 --directory dist
```

http://localhost:8000 を開いてください。ビルドやnpmのインストールは不要です。

## ファイル

- `dist/index.html`: ページ構成
- `dist/style.css`: 配色、レイアウト、スマートフォン対応
- `dist/script.js`: 政策の詳細、ダイアログ、メニュー
- `dist/assets/`: 写真とデザイン素材

## 試作段階の項目

写真はAI生成の仮素材です。資料集とミニアプリは構想の説明のみで、実データの表示・計算は未実装です。お問い合わせ先は未設定で、送信機能はありません。公開前に本人の写真と確定した情報へ差し替えてください。

`reference.png`は政策カードの写真領域をCSSで表示するために使用しています。

## 公開

公開対象のディレクトリは `dist` です。このリポジトリへのpushによる自動公開は設定していません。
