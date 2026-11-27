import { execFileSync } from 'node:child_process';

if (!process.env.CI && process.env.HUSKY !== '0' && process.env.NODE_ENV !== 'production') {
  let existing = '';
  try {
    existing = execFileSync('git', ['config', '--get', 'core.hooksPath'], {
      encoding: 'utf8',
    }).trim();
  } catch (cause) {
    if (cause.status !== 1) throw cause;
  }
  if (existing && !['.husky', '.husky/_'].includes(existing)) {
    process.stderr.write(
      `Existing hooksPath preserved (${existing}); chain npx lint-staged in your current pre-commit hook.\n`,
    );
  } else {
    const { default: husky } = await import('husky');
    const result = husky();
    if (result) throw new Error(result);
  }
}
