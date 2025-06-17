import { defineConfig } from "eslint/config";
import compat from "eslint-plugin-compat";
import globals from "globals";
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
    extends: compat.extends("plugin:node/recommended"),

    plugins: {
        compat,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            emit: true,
        },

        ecmaVersion: 2020,
        sourceType: "commonjs",
    },

    rules: {
        "no-console": "error",
        "no-process-exit": "off",
        "node/no-extraneous-require": ["off"],
    },
}, {
    files: ["src/public/**/*.js"],

    languageOptions: {
        globals: {
            ...globals.browser,
        },
    },

    rules: {
        "no-console": "off",
        "compat/compat": "error",
    },
}]);