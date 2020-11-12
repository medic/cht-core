module.exports = {
  extends: [
    "@medic",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  "env": {
    "browser": true,
    "jquery": true,
    "node": true
  },
  "globals": {
    "angular": true,
    "Tour": true
  },
  "overrides": [
    {
      "files": [
        "src/js/bootstrapper/*.js",
      ],
      "rules": {
        "no-console": "off"
      }
    }
  ]
};
