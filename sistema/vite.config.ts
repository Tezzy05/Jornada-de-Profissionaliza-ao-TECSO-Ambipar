import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// O build gera um único HTML em ../app, que abre com duplo clique (sem servidor).
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: '../app',
    emptyOutDir: true,
    chunkSizeWarningLimit: 6000,
    assetsInlineLimit: 100_000_000,
  },
  server: { port: 5173, open: true },
});
