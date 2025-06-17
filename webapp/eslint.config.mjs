import { defineConfig } from "eslint/config";
import compat from "eslint-plugin-compat";
import globals from "globals";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import angularEslintEslintPlugin from "@angular-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import angularEslintEslintPluginTemplate from "@angular-eslint/eslint-plugin-template";
import parser from "@angular-eslint/template-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    plugins: {
        compat,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.jquery,
            ...globals.node,
        },

        ecmaVersion: 2018,
        sourceType: "commonjs",
    },

    rules: {
        "compat/compat": "error",
    },
}, {
    files: ["src/js/**/*.js"],

    rules: {
        "no-console": "off",
    },
}, {
    files: ["**/*.ts", "**/*.tsx"],

    plugins: {
        "@typescript-eslint": typescriptEslint,
        "@angular-eslint": angularEslintEslintPlugin,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            createDefaultProgram: true,
        },
    },

    rules: {
        "@angular-eslint/component-class-suffix": "error",
        "@angular-eslint/contextual-lifecycle": "error",
        "@angular-eslint/directive-class-suffix": "error",
        "@angular-eslint/no-conflicting-lifecycle": "error",
        "@angular-eslint/no-input-rename": "error",
        "@angular-eslint/no-inputs-metadata-property": "error",
        "@angular-eslint/no-output-native": "error",
        "@angular-eslint/no-output-rename": "error",
        "@angular-eslint/no-outputs-metadata-property": "error",
        "@angular-eslint/use-lifecycle-interface": "warn",
        "@angular-eslint/use-pipe-transform-interface": "error",
        "no-console": "off",
        "no-restricted-syntax": "off",
        "no-unused-vars": "off",

        "@typescript-eslint/no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
            varsIgnorePattern: "^_",
        }],

        "@typescript-eslint/ban-ts-comment": "error",
        "quote-props": ["error", "as-needed"],
    },
}, {
    files: ["**/*.spec.ts"],

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
    },

    rules: {
        "@typescript-eslint/ban-ts-comment": "off",
    },
}, {
    files: ["**/*.component.html"],
    extends: compat.extends("plugin:@angular-eslint/template/recommended"),

    plugins: {
        "@angular-eslint/template": angularEslintEslintPluginTemplate,
    },

    languageOptions: {
        parser: parser,
    },

    rules: {
        indent: "off",
        "max-len": "off",
    },
}, {
    files: ["src/js/enketo/widgets/*.js"],

    rules: {
        "no-inner-declarations": "off",
    },
}]);