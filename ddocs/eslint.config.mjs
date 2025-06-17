import { defineConfig } from "eslint/config";
import couchdb from "eslint-plugin-couchdb";

export default defineConfig([{
    plugins: {
        couchdb,
    },

    languageOptions: {
        ecmaVersion: 5,
        sourceType: "script",
    },

    rules: {
        semi: "off",
        indent: "off",
        "eol-last": "off",
        "no-var": "off",
    },
}]);