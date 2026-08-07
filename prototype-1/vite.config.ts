import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    // 8080 and 8081 belong to sibling projects on this machine. PORT is injected
    // by Claude Code's preview runner so parallel sessions don't collide.
    port: Number(process.env.PORT) || 8082,
    strictPort: true,
    host: '::',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
