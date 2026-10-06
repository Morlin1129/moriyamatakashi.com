import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 取り組み：1ページ = 1つの Markdown ファイル（src/content/policies/*.md）
// frontmatter は一覧・トップ・資料集が使う項目。詳細ページの本文（課題・提案・確かめたいこと・目指す姿）は Markdown で書く。
// 本文の書き方は README「取り組みを追加・編集する」を参照
const policies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/policies' }),
  schema: z.object({
    order: z.number(),
    badge: z.string(),
    plain: z.string(),
    title: z.string(),
    titleLines: z.array(z.string()),
    lead: z.string(),
    policyName: z.string().optional(),
    image: z.object({ src: z.string(), alt: z.string() }),
    resources: z.array(z.object({ title: z.string(), url: z.string().url(), note: z.string() })),
  }),
});

export const collections = { policies };
