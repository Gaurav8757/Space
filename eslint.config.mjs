import js from '@eslint/js';

const config = [
  js.configs.recommended,
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**'],
  },
];

export default config;
