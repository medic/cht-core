import { defineConfig } from "eslint/config";
import json from "eslint-plugin-json";
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
    extends: compat.extends("@medic"),

    plugins: {
        json,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            contact: true,
            lineage: true,
            reports: true,
        },
    },

    rules: {
        "max-len": "off",
        "no-console": "off",
        "no-debugger": "off",

        quotes: ["error", "single", {
            allowTemplateLiterals: true,
            avoidEscape: true,
        }],
    },
}]);