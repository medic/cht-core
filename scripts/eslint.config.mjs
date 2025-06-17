import { defineConfig } from "eslint/config";
import compat from "eslint-plugin-compat";
import globals from "globals";

export default defineConfig([{
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
        "no-console": "off",
    },
}]);