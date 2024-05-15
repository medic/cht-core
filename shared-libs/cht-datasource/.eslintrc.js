module.exports = {
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/strict-type-checked.ts
        'plugin:@typescript-eslint/strict-type-checked',
        // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/stylistic-type-checked.ts
        'plugin:@typescript-eslint/stylistic-type-checked'
      ],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname
      },
      rules: {
        ['@typescript-eslint/explicit-module-boundary-types']: ['error', { allowedNames: ['getDatasource'] }],
        ['@typescript-eslint/no-confusing-void-expression']: ['error', { ignoreArrowShorthand: true }],
        ['@typescript-eslint/no-empty-interface']: ['error', { allowSingleExtends: true }],
        ['@typescript-eslint/no-namespace']: 'off',
      }
    }
  ]
};
