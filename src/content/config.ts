import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      image: image(),
      imageAlt: z.string(),
      externalUrl: z.string().url().optional(),
      demoUrl: z.string().optional(),
      tech: z.array(z.string()).default([]),
      order: z.number().default(100),
    }),
});

const papers = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string(),
      image: image(),
      imageAlt: z.string(),
      url: z.string().url(),
      venue: z.string().optional(),
      year: z.number().optional(),
      order: z.number().default(100),
    }),
});

export const collections = { projects, papers };
