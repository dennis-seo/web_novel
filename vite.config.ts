import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/web_novel/',
  build: {
    outDir: 'dist',
  },
  server: {
    open: true,
  },
});
