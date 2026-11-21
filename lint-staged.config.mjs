const stagedChecks = {
  'src/**/*.{js,jsx,mjs,ts,tsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  'tests/**/*.{mjs,ts,tsx}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '{package,tsconfig,jsconfig}.json': ['prettier --write'],
  '{eslint.config,lint-staged.config,next.config,postcss.config}.mjs': ['prettier --write'],
  'playwright*.ts': ['prettier --write'],
  '.github/**/*.yml': ['prettier --write'],
  'docs/**/*.md': ['prettier --write'],
};

export default stagedChecks;
