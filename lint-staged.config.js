module.exports = {
  '{packages,e2e,docs}/**/*.{ts,js,json,md,html,css,scss}': [
    'pnpm nx affected --target lint --uncommitted --fix true',
    'pnpm nx format:write --uncommitted',
  ],
  '*.{js,md,json}': ['pnpm nx format:write --uncommitted'],
};
