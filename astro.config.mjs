import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://www.kennethallenmath.com',
  integrations: [mdx()],
  build: {
    format: 'directory',
  },
});
