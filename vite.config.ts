import path from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: { port: 3000, host: '127.0.0.1', proxy: { '/api.php': 'http://127.0.0.1:8080' } },
  plugins: [react(), {
    name: 'bundle-php-api',
    closeBundle() {
      mkdirSync('dist/_server', { recursive: true });
      for (const file of ['security.php', 'database.php']) copyFileSync(`server/${file}`, `dist/_server/${file}`);
      copyFileSync('server/deny.htaccess', 'dist/_server/.htaccess');
    },
  }],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
