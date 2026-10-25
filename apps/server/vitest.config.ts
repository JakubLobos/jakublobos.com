import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test-support/**'],
      // docs/testing.md section 7: server overall floor; domain/** is held to the stricter bar.
      thresholds: {
        lines: 80,
        branches: 75,
        'src/domain/**': { lines: 90, branches: 85 },
      },
    },
  },
});
