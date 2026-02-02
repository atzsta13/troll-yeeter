import { defineConfig } from 'vitest/config';
import fs from 'fs';
import path from 'path';

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  test: {
    // Needed due to the custom conditions within devvit web
    typecheck: {
      enabled: false,
    },
    reporters: ['dot'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary', 'html'],
    },
    projects: [
      {
        define: {
          '__APP_VERSION__': JSON.stringify(packageJson.version),
        },
        test: {
          name: 'server',
          include: ['src/server/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        define: {
          '__APP_VERSION__': JSON.stringify(packageJson.version),
        },
        test: {
          name: 'client',
          include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
          exclude: ['src/server/**/*'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
