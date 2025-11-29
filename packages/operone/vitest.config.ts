import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    name: '@repo/operone',
    testTimeout: 15000,
  },
});
