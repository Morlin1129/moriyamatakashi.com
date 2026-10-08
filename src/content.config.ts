import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 取り組み：1ページ = 1つの Markdown ファイル（src/content/policies/*.md）
// frontmatter はリーフレット（政策パンフレット）の文言。トップ・一覧・詳細の冒頭・資料集が使う。
// 詳細ページの本文（課題・提案・確かめたいこと・目指す姿）は Markdown で書く。
// 本文の書き方は README「取り組みを追加・編集する」を参照
const policies = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/policies' }),
  schema: z.object({
    order: z.number(),
    pretitle: z.string().optional(), // 見出しの上に添える小さな一文（例：小高も鹿島も、もちろん原町のことも）
    title: z.string(), // 見出し。トップ・一覧・パンくず・資料集のチップ・<title>
    titleLines: z.array(z.string()), // 詳細ページの見出しを改行位置で分けたもの
    lead: z.string(), // 見出しの下の一文
    summary: z.string(), // リーフレットの本文。詳細ページの冒頭に「概要」として載せ、一覧では先頭の抜粋を出す。空行で段落を分ける
    image: z.object({ src: z.string(), alt: z.string() }),
    resources: z.array(z.object({ title: z.string(), url: z.string().url(), note: z.string() })).optional(),
  }),
});

export const collections = { policies };
