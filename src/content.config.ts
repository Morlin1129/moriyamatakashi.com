import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 取り組み：1ページ = 1つの YAML ファイル（src/content/policies/*.yaml）
const policies = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/policies' }),
  schema: z.object({
    order: z.number(),
    badge: z.string(),
    title: z.string(),
    titleLines: z.array(z.string()),
    lead: z.string(),
    policyName: z.string().optional(),
    image: z.object({ crop: z.number(), alt: z.string() }),
    issue: z.array(z.string()),
    actions: z.array(z.object({ title: z.string(), text: z.string() })),
    checks: z.array(z.string()),
    goalHeading: z.string(),
    goal: z.array(z.string()),
    resources: z.array(z.object({ title: z.string(), url: z.string().url(), note: z.string() })),
  }),
});

export const collections = { policies };
