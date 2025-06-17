import { defineConfig } from "eslint/config";
import noOnlyTests from "eslint-plugin-no-only-tests";
import jasmine from "eslint-plugin-jasmine";
import async from "eslint-plugin-async";
import globals from "globals";

export default defineConfig([{
    plugins: {
        "no-only-tests": noOnlyTests,
        jasmine,
        async,
    },

    languageOptions: {
        globals: {
            ...globals.jasmine,
            ...globals.jquery,
            ...globals.node,
            $: true,
            $$: true,
            document: true,
            caches: true,
            navigator: true,
        },

        ecmaVersion: 2020,
        sourceType: "commonjs",
    },

    rules: {
        "async/missing-await-in-async-fn": "error",
        "no-only-tests/no-only-tests": "error",
        "jasmine/no-focused-tests": "error",
        "no-console": "off",

        "space-before-function-paren": ["error", {
            anonymous: "ignore",
            named: "ignore",
            asyncArrow: "always",
        }],
    },
}]);