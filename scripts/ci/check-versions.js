/**
 * If publishing a tag, check to ensure the package.json version matches
 */
const { TAG } = process.env;
const packageVersion = require('../../package.json').version;

if (TAG && !TAG.startsWith(packageVersion)) {
  console.error(`git tag "${TAG}" does not match package.json version "${packageVersion}"`);
  process.exit(1);
}
