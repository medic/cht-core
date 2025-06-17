import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([{
    languageOptions: {
        globals: {
            ...globals.mocha,
            ...globals.browser,
        },

        ecmaVersion: 2018,
        sourceType: "script",
    },

    rules: {
        "no-console": "off",
        "angular/window-service": "off",
        "angular/timeout-service": "off",
    },
}]);