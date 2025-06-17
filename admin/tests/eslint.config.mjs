import { defineConfig } from "eslint/config";
import noOnlyTests from "eslint-plugin-no-only-tests";
import jasmine from "eslint-plugin-jasmine";
import globals from "globals";

export default defineConfig([{
    plugins: {
        "no-only-tests": noOnlyTests,
        jasmine,
    },

    languageOptions: {
        globals: {
            ...globals.jasmine,
            ...globals.jquery,
            ...globals.node,
        },

        ecmaVersion: 8,
        sourceType: "commonjs",
    },

    rules: {
        "no-only-tests/no-only-tests": "error",
        "jasmine/no-focused-tests": "error",
        "no-console": "off",
    },
}]);