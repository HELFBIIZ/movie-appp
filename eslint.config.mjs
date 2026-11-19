import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// The legacy application is JavaScript. Apply the new checks to SceneChain;
// migrating unrelated payment/auth code is deliberately a separate milestone.
const files = ['src/components/learning/**/*.{ts,tsx}', 'src/lib/learning/**/*.ts'];
export default defineConfig([
  ...nextVitals.map((config) => ({ ...config, files })),
  ...nextTs.map((config) => ({ ...config, files })),
  {
    files,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: 'error',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores(['.next/**', 'node_modules/**']),
]);
