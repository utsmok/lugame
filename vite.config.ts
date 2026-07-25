import { defineConfig } from 'vite';

// base: '/lugame/' so asset URLs resolve under the GitHub Pages project site
// (served from https://utsmok.github.io/lugame/). Locally `vite dev` ignores base.
export default defineConfig({
  base: '/lugame/',
  server: { host: true, port: 5173 },
});
