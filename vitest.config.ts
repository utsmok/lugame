import { defineConfig } from 'vitest/config';

// Vitest config for lugame. The solver under test is pure TS (no DOM), so the
// default node environment is fine. Test files live next to the modules they
// cover, matching the existing `src/**/*.ts` layout.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
