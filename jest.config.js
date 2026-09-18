/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/lib/**/*.js',
    'src/lib/**/*.mjs',
    '!src/lib/**/*.json',
  ],
}
