module.exports = {
  overrides: [
    {
      files: ['*.ts'],
      extends: [
        // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/strict-type-checked.ts
        'plugin:@typescript-eslint/strict-type-checked',
        // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/stylistic-type-checked.ts
        'plugin:@typescript-eslint/stylistic-type-checked',
        'plugin:jsdoc/recommended-typescript-error',
        'plugin:compat/recommended',
      ],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'jsdoc', 'compat'],
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname
      },
      settings: {
        jsdoc: {
          contexts: [
            'VariableDeclaration',
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration',
            'TSMethodSignature'
          ]
        }
      },
      rules: {
        ['@typescript-eslint/explicit-module-boundary-types']: ['error', { allowedNames: ['getDatasource'] }],
        ['@typescript-eslint/no-confusing-void-expression']: ['error', { ignoreArrowShorthand: true }],
        ['@typescript-eslint/no-empty-interface']: ['error', { allowSingleExtends: true }],
        ['@typescript-eslint/no-namespace']: 'off',
        ['@typescript-eslint/no-non-null-assertion']: 'off',
        ['jsdoc/require-jsdoc']: ['error', {
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            ClassExpression: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
            MethodDefinition: true,
          },
          publicOnly: true,
        }]
      }
    }
  ]
};
