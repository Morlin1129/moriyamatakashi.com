import { fileURLToPath } from 'node:url';
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

// 各 .astro の <style lang="scss"> と .scss から、トークン（変数・mixin）を @use なしで使えるようにする
const tokens = fileURLToPath(new URL('./src/styles/abstracts/_tokens.scss', import.meta.url));

export default defineConfig({
  // 静的サイトのまま。お問い合わせの API（src/pages/api/contact.ts）だけ prerender = false で Vercel の関数になる
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'always',
  build: { format: 'directory' },
  env: {
    schema: {
      // Turnstile のサイトキー（公開してよい値）。秘密の値は API 側で getSecret() を使って実行時に読む
      TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      // Google アナリティクス 4 の測定 ID（G-…）。設定したときだけ Base.astro が gtag.js を読み込む
      GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
  // :where() でスコープし、詳細度を増やさない（共通 CSS との優先順位を書いた通りに保つため）
  scopedStyleStrategy: 'where',
  vite: {
    css: {
      preprocessorOptions: {
        scss: { additionalData: `@use "${tokens}" as *;\n` },
      },
    },
  },
});
