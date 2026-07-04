import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.kennethallenmath.com',
  integrations: [mdx(), sitemap({ lastmod: new Date() })],
  build: {
    format: 'directory',
  },
});
