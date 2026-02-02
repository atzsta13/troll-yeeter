import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
    plugins: [react(), tailwind()],
    define: {
        '__APP_VERSION__': JSON.stringify(packageJson.version),
    },
    server: {
        port: 5174,
        strictPort: true,
    }
});
