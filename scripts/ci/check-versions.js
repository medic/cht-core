/**
 * If publishing a tag, check to ensure the package.json version matches
 */
const { TRAVIS_TAG } = process.env;
const packageVersion = require('../../package.json').version;

if (TRAVIS_TAG && !TRAVIS_TAG.startsWith(packageVersion)) {
  console.error(`git tag "${TRAVIS_TAG}" does not match package.json version "${packageVersion}"`);
  process.exit(1);
}
