import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// GitHub Pages: served from https://<user>.github.io/dog-translator/
// If you deploy to a custom domain or the repo root, change `base` to '/'.
export default defineConfig({
    base: './',
    plugins: [react()],
});
