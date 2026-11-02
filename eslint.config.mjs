import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Keep tooling and test files outside their production tsconfigs,
          // while still giving type-aware rules a small, explicit project.
          allowDefaultProject: [
            'eslint.config.mjs',
            'vitest.workspace.ts',
            'apps/api/drizzle.config.ts',
            'apps/api/vitest.config.ts',
            'apps/api/tests/harness.ts',
            'apps/api/tests/harness.test.ts',
            'apps/api/tests/setup.ts',
            'apps/web/postcss.config.js',
            'apps/web/tailwind.config.js',
          ],
          defaultProject: 'tsconfig.eslint.json',
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 9,
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error'
    }
  },
  // Add boundary rules for packages
  {
    files: ['packages/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['apps/*', '@360events/api', '@360events/web', '@360events/worker'],
            message: 'Shared packages must not import from applications.'
          },
          {
            group: ['drizzle-orm', 'postgres'],
            message: 'Database types and ORM internals must not leak into shared public packages.'
          }
        ]
      }]
    }
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**']
  }
);
