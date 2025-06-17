import { defineConfig } from "eslint/config";
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

    languageOptions: {
        globals: {
            ...globals.node,
        },

        ecmaVersion: 2020,
        sourceType: "commonjs",
    },

    rules: {
        "no-console": "error",
        "no-process-exit": "off",
        "node/no-extraneous-require": ["off"],
    },
}]);