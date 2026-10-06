// Astro 7 の Markdown 処理系 Sätteri 用プラグイン。文書全体を h2 ごとの <section> に組み直す。
// astro.config.mjs の markdown.processor に渡す。
import { sectionize } from './sectionize.mjs';

export const satteriSections = {
  name: 'sections',
  after(root, ctx) {
    ctx.replaceNode(root, { type: 'root', children: sectionize(root.children) });
  },
};
