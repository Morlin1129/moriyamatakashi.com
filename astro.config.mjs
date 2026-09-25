import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

// 各 .astro の <style lang="scss"> と .scss から、トークン（変数・mixin）を @use なしで使えるようにする
const tokens = fileURLToPath(new URL('./src/styles/abstracts/_tokens.scss', import.meta.url));

export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
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
