import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { fixupPluginRules } from '@eslint/compat';
import promisePlugin from 'eslint-plugin-promise';
import nodePlugin from 'eslint-plugin-n';
import { defineConfig, globalIgnores } from 'eslint/config';
import angularPlugin from 'eslint-plugin-angular';
import globalsPlugin from 'globals';
import compatPlugin from 'eslint-plugin-compat';
import * as espree from 'espree';
import noOnlyTests from 'eslint-plugin-no-only-tests';
import jasminePlugin from 'eslint-plugin-jasmine';
import asyncPlugin from 'eslint-plugin-async';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import tsParser from '@typescript-eslint/parser';
import angularEslintEslintPlugin from '@angular-eslint/eslint-plugin';
import angularEslintEslintPluginTemplate from '@angular-eslint/eslint-plugin-template';
import templateParser from '@angular-eslint/template-parser';
import stylisticPlugin from '@stylistic/eslint-plugin';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const JS_DOC_REQUIRED_CONTEXTS = [
  'FunctionDeclaration',
  'FunctionExpression',
  'VariableDeclaration',
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSEnumDeclaration',
  'TSMethodSignature'
];

export default defineConfig([
  globalIgnores([
    '**/node_modules/**/*',
    'allure-report/**/*',
    'allure-report-bak/**/*',
    'api/build/**/*',
    'api/extracted-resources/**/*',
    'api/src/enketo-transformer/**/*',
    'api/src/public/login/lib-bowser.js',
    'build/**/*',
    'jsdocs/**/*',
    'shared-libs/cht-datasource/dist/**/*',
    'shared-libs/cht-datasource/docs/**/*',
    'tests/scalability/report*/**/*',
    'tests/scalability/jmeter/**/*',
    'webapp/src/ts/providers/xpath-element-path.provider.ts',
    'webapp/dist/**/*',
    '.github/**/compiled/index.js'
  ]),
  {
    files: ['**/*.{js,ts,jsx,tsx,cjs,cts,mjs,mts}'],
    extends: compat.extends('@medic'),
    plugins: {
      node: nodePlugin,
      '@stylistic': stylisticPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globalsPlugin.node,
      },
    },
    rules: {
      '@stylistic/eol-last': 'error',
      'eol-last': 'off',
      '@stylistic/indent': ['error', 2],
      'indent': 'off',
      '@stylistic/max-len': ['error', { code: 120, ignoreUrls: true, tabWidth: 2}],
      'max-len': 'off',
      'no-redeclare': ['error', { builtinGlobals: false }],
      '@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: true }],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/array-bracket-newline': [ 'error', 'consistent' ],
      '@stylistic/arrow-spacing': [
        'error', {
          before: true,
          after: true,
        }
      ],
      '@stylistic/brace-style': [ 'error', '1tbs' ],
      '@stylistic/comma-spacing': [
        'error', {
          before: false,
          after: true,
        }
      ],
      '@stylistic/comma-style': [ 'error', 'last' ],
      '@stylistic/dot-location': [ 'error', 'property' ],
      'func-call-spacing': [ 'error', 'never' ],
      'func-style': [ 'error', 'expression' ],
      '@stylistic/function-call-argument-newline': [ 'error', 'consistent' ],
      '@stylistic/function-paren-newline': [ 'error', 'consistent' ],
      'implicit-arrow-linebreak': [ 'error', 'beside' ],
      '@stylistic/key-spacing': [
        'error', {
          beforeColon: false,
          afterColon: true,
        }
      ],
      '@stylistic/keyword-spacing': [
        'error', {
          before: true,
          after: true,
        }
      ],
      '@stylistic/linebreak-style': [ 'error', 'unix' ],
      '@stylistic/lines-between-class-members': [
        'error', 'always', {
          exceptAfterSingleLine: true,
        }
      ],
      '@stylistic/new-parens': 'error',
      'no-alert': 'error',
      'node/no-exports-assign': 'error',
      'rest-spread-spacing': [ 'error', 'never' ],
      '@stylistic/semi-spacing': [
        'error', {
          before: false,
          after: true,
        }
      ],
      'semi-style': [ 'error', 'last' ],
      'unicode-bom': [ 'error', 'never' ],
    },
  },
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      sourceType: 'module',
      parser: tsParser,
    }
  },
  {
    files: ['**/*.d.ts'],
    languageOptions: {
      sourceType: 'module',
      parser: tsParser,
    },
    rules: {
      'no-unused-vars': 'off'
    }
  },
  {
    files: ['**/*.{js,jsx,cjs,mjs,mts}'],
    languageOptions: {
      sourceType: 'commonjs',
    }
  },
  {
    files: ['**/test/**', '**/tests/**'],
    plugins: {
      'no-only-tests': noOnlyTests,
      promise: promisePlugin,
      async: asyncPlugin,
    },
    languageOptions: {
      globals: {
        ...globalsPlugin.node,
        ...globalsPlugin.mocha,
        ...globalsPlugin.chai,
        ...globalsPlugin.jasmine,
      }
    },
    rules: {
      'async/missing-await-in-async-fn': 'error',
      'no-only-tests/no-only-tests': 'error',
      'promise/catch-or-return': 'error',
      'no-global-assign': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['config/**/**'],
    languageOptions: {
      globals: {
        contact: true,
        lineage: true,
        reports: true,
      }
    },
    rules: {
      '@stylistic/brace-style': 'off',
      '@stylistic/max-len': 'off',
      '@stylistic/array-bracket-newline': 'off',
      'func-style': 'off',
      '@stylistic/function-call-argument-newline': 'off',
      '@stylistic/function-paren-newline': 'off',
      '@stylistic/key-spacing': 'off',
    },
  },
  {
    files: ['admin/**/*'],
    plugins: {
      compat: compatPlugin,
      angular: fixupPluginRules(angularPlugin),
    },
    languageOptions: {
      globals: {
        ...globalsPlugin.browser,
        ...globalsPlugin.commonjs,
        ...globalsPlugin.jquery,
        angular: true,
      },
    },
    rules: {
      'compat/compat': 'error',
      'angular/window-service': 'error',
      'angular/timeout-service': 'error',
      'angular/module-getter': 'error',
      'angular/module-setter': 'error',
      'angular/no-private-call': 'error',
      'angular/di-unused': 'error',
      'angular/on-watch': 'error',
      'angular/no-cookiestore': 'error',
      'angular/no-directive-replace': 'error',
      'angular/no-http-callback': 'error',
      'angular/di-order': 'error',
      'angular/di': 'error',
      'angular/module-dependency-order': 'error',
      'angular/one-dependency-per-line': 'error',
      'angular/interval-service': 'error',
      'angular/on-destroy': 'error',
    },
  },
  {
    files: ['admin/src/js/main.js', 'admin/tests/**/*'],
    plugins: {
      angular: fixupPluginRules(angularPlugin),
    },
    rules: {
      'angular/window-service': 'off',
      'angular/timeout-service': 'off',
      'angular/di-order': 'off',
      'angular/interval-service': 'off',
    },
  },
  {
    files: ['admin/tests/**/*'],
    plugins: {
      jasmine: jasminePlugin,
    },
    languageOptions: {
      globals: {
        ...globalsPlugin.jasmine,
        ...globalsPlugin.jquery,
        ...globalsPlugin.node,
        ...globalsPlugin.chai,
        sinon: true,
        chai: true,
        Q: true,
        inject: true,
        KarmaUtils: true,
        moment: true,
        _: true,
      },
      ecmaVersion: 2020,
      sourceType: 'commonjs',
    },
    rules: {
      'no-only-tests/no-only-tests': 'error',
      'jasmine/no-focused-tests': 'error',
    },
  },
  {
    files: [ 'api/**/*', 'sentinel/**/*'],
    extends: compat.extends('plugin:n/recommended-module'),
    plugins: {
      compat: compatPlugin,
      n: nodePlugin,
    },
    languageOptions: {
      globals: {
        ...globalsPlugin.node,
        emit: true,
      },
      ecmaVersion: 2020,
      sourceType: 'commonjs',
    },
    rules: {
      'n/no-process-exit': 'off',
      'n/no-extraneous-require': 'off',
    },
  },
  {
    files: ['api/src/public/**/*.js'],
    plugins: {
      compat: compatPlugin,
      n: nodePlugin,
    },
    languageOptions: {
      globals: {
        ...globalsPlugin.browser,
      }
    },
    rules: {
      'no-console': 'off',
      'compat/compat': 'error',
      'n/no-unsupported-features/node-builtins': 'off'
    },
  },
  {
    files: ['ddocs/**/*.js'],
    languageOptions: {
      ecmaVersion: 6,
      sourceType: 'script',
      parser: {
        meta: {
          name: 'custom CouchDb design document parser',
        },
        parse: (code, options) => {
          return espree.parse('module.exports = ' + code, options);
        },
      },
      globals: {
        emit: true,
        log: true,
        index: true,
      }
    },
    rules: {
      semi: 'off',
      '@stylistic/semi': 'off',
      '@stylistic/indent': 'off',
      '@stylistic/keyword-spacing': 'off',
      '@stylistic/eol-last': 'off',
      'eol-last': 'off',
      'no-var': 'off',
      'function-paren-newline': 'off',
      'keyword-spacing': 'off',
      'func-names': 'off',
      'func-style': 'off'
    },
  },
  {
    files: ['nginx/tests/**/*.spec.js'],
    rules: {
      '@stylistic/max-len': 'off',
    },
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off',
    }
  },
  {
    files: ['tests/**/*'],
    plugins: {
      jasmine: jasminePlugin,
      async: asyncPlugin,
    },
    languageOptions: {
      globals: {
        ...globalsPlugin.node,
        ...globalsPlugin.chai,
        chai: true,
        browser: true,
        $: true,
        $$: true,
        document: true,
        caches: true,
        navigator: true,
      },
      sourceType: 'script',
    },
    rules: {
      'no-only-tests/no-only-tests': 'error',
      'jasmine/no-focused-tests': 'error',
      'no-console': 'off',
      'space-before-function-paren': ['error', {
        anonymous: 'ignore',
        named: 'ignore',
        asyncArrow: 'always',
      }],
    },
  },
  {
    files: ['webapp/**/*'],
    plugins: {
      compat: compatPlugin,
    },
    languageOptions: {
      globals: {
        ...globalsPlugin.browser,
        ...globalsPlugin.jquery,
      },
      ecmaVersion: 2018,
      sourceType: 'commonjs',
    },
    rules: {
      'compat/compat': 'error',
    },
  },
  {
    files: ['webapp/src/js/**/*.js'],
    rules: {
      'no-console': 'off',
    }
  },
  {
    files: ['webapp/**/*.ts', 'webapp/**/*.tsx'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
      '@angular-eslint': angularEslintEslintPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'script',
      parserOptions: {
        createDefaultProgram: true,
      },
    },
    rules: {
      '@angular-eslint/component-class-suffix': 'error',
      '@angular-eslint/contextual-lifecycle': 'error',
      '@angular-eslint/directive-class-suffix': 'error',
      '@angular-eslint/no-conflicting-lifecycle': 'error',
      '@angular-eslint/no-input-rename': 'error',
      '@angular-eslint/no-inputs-metadata-property': 'error',
      '@angular-eslint/no-output-native': 'error',
      '@angular-eslint/no-output-rename': 'error',
      '@angular-eslint/no-outputs-metadata-property': 'error',
      '@angular-eslint/use-lifecycle-interface': 'warn',
      '@angular-eslint/use-pipe-transform-interface': 'error',
      'no-console': 'off',
      'no-restricted-syntax': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/ban-ts-comment': 'error',
      'quote-props': ['error', 'as-needed'],
    },
  },
  {
    files: ['webapp/**/*.spec.ts'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globalsPlugin.mocha,
        ...globalsPlugin.node,
        ...globalsPlugin.jquery,
      },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  {
    files: ['webapp/**/*.component.html'],
    extends: compat.extends('plugin:@angular-eslint/template/recommended'),
    plugins: {
      '@angular-eslint/template': angularEslintEslintPluginTemplate,
    },
    languageOptions: {
      parser: templateParser,
    },
    rules: {
      indent: 'off',
      'max-len': 'off',
    },
  },
  {
    files: ['webapp/src/js/bootstrapper/offline-ddocs/**/*.js'],
    languageOptions: {
      globals: {
        emit: true,
      },
    },
  },
  {
    files: ['webapp/src/js/enketo/widgets/*.js'],
    rules: {
      'no-inner-declarations': 'off',
    },
  },
  {
    files: ['webapp/tests/**/*'],
    languageOptions: {
      globals: {
        ...globalsPlugin.mocha,
        ...globalsPlugin.browser,
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/deploy/**/*'],
    languageOptions: {
      sourceType: 'module',
    }
  },
  // ======= JSDOC & TYPESCRIPT-ESLINT CHT-DATASOURCE BLOCKS =======
  {
    files: ['shared-libs/cht-datasource/**/*.ts'],
    extends: compat.extends(
      'plugin:@typescript-eslint/strict-type-checked',
      'plugin:@typescript-eslint/stylistic-type-checked',
      'plugin:jsdoc/recommended-typescript-error',
      'plugin:compat/recommended',
    ),
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: 'shared-libs/cht-datasource/'
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    settings: {
      jsdoc: {
        contexts: [],
      },
      polyfills: ['Report'],
    },
    rules: {
      ['@typescript-eslint/explicit-module-boundary-types']: ['error', {
        allowedNames: ['getDatasource'],
      }],
      ['@typescript-eslint/no-confusing-void-expression']: ['error', {
        ignoreArrowShorthand: true,
      }],
      ['@typescript-eslint/no-empty-interface']: ['error', {
        allowSingleExtends: true,
      }],
      ['@typescript-eslint/no-namespace']: 'off',
      ['@typescript-eslint/no-non-null-assertion']: 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      ['jsdoc/require-jsdoc']: ['error', {
        require: {
          ArrowFunctionExpression: true,
          ClassDeclaration: true,
          ClassExpression: true,
          FunctionDeclaration: true,
          FunctionExpression: true,
          MethodDefinition: true,
        },
        contexts: JS_DOC_REQUIRED_CONTEXTS,
        publicOnly: true,
      }],
      ['jsdoc/require-param']: ['error', {
        contexts: JS_DOC_REQUIRED_CONTEXTS,
        exemptedBy: ['inheritdoc', 'private', 'internal'],
      }],
      ['jsdoc/require-returns']: ['error', {
        contexts: JS_DOC_REQUIRED_CONTEXTS,
        exemptedBy: ['inheritdoc', 'private', 'internal'],
      }],
      ['jsdoc/require-yields']: ['error', {
        contexts: JS_DOC_REQUIRED_CONTEXTS,
        exemptedBy: ['inheritdoc', 'private', 'internal'],
      }],
      ['jsdoc/check-tag-names']: ['error', {
        definedTags: ['typeParam'],
      }],
    },
  },
  {
    files: ['shared-libs/cht-datasource/**/*.spec.ts'],
    // DO NOT re-add jsdoc plugin here!
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      ['@typescript-eslint/no-unused-expressions']: 'off',
    },
  }
]);