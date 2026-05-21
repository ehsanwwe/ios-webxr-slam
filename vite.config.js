import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./demo', import.meta.url));
const src = fileURLToPath(new URL('./src', import.meta.url));

export default defineConfig({
  root,
  plugins: [basicSsl()],
  resolve: {
    alias: {
      webarkit: `${src}/index.js`,
    },
  },
  server: {
    host: true,
    port: 5173,
    https: true,
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
  },
});
