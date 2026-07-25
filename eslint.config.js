// Flat ESLint config for lugame.
//
// Goals: fast (non-type-aware), zero noise on the existing hand-formatted
// codebase, and a safety net for new code. TypeScript's own `noUnusedLocals`
// and `noImplicitReturns` already cover the cases `no-unused-vars` /
// `no-undef` would flag, so those ESLint rules are turned off to avoid
// duplicating tsc (and firing on patterns tsc considers fine).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // Build output + vendored assets + tooling config files are not linted.
  {
    ignores: ['dist/', 'additional_graphics/', 'public/', 'coverage/', '**/*.config.*'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // tsc's `noUnusedLocals` already enforces this; keep ESLint quiet so the
      // two tools never disagree (and so `_`-prefixed args don't fire).
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      // tsc checks undefined names in TS files; `no-undef` produces false
      // positives under TS + bundler module resolution.
      'no-undef': 'off',
      // The hand-authored engine/render modules use a couple of intentional
      // `let`-that-could-be-`const` and ternary-as-statement (canvas path
      // drawing) patterns. Downgraded to warn so the gate stays green on the
      // current tree while still surfacing fresh violations for review.
      'prefer-const': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
);
