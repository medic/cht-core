/**
 * Bundle all templates and precache in one go.
 * Similar to https://www.npmjs.com/package/grunt-angular-templates except without the grunt
 * Similar to https://github.com/yaru22/ng-html2js except supports multiple templates
 */

const { readdir, readFile, writeFile, appendFile } = require('node:fs/promises');

const TEMPLATE_DIR = 'admin/src/templates/';
const OUTPUT_FILE = 'api/build/static/admin/js/templates.js';

const FILE_PREFIX = `angular.module('adminApp').run(['$templateCache', function($templateCache) {
  'use strict';
`;

const FILE_SUFFIX = `
}]);
`;

const writePrefix = async () => writeFile(OUTPUT_FILE, FILE_PREFIX);
const writeBody = async (content) => appendFile(OUTPUT_FILE, content);
const writeSuffix = async () => appendFile(OUTPUT_FILE, FILE_SUFFIX);

const escapeContent = (content) => {
  return content
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, '');
};

const getContent = async (file) => {
  const raw = await readFile(TEMPLATE_DIR + file, { encoding: 'utf8' });
  const escaped = escapeContent(raw);
  return `
  $templateCache.put('templates/${file}',
    "${escaped}"
  );`;
};

(async () => {
  console.log(`Build angularjs template cache from "${TEMPLATE_DIR}" to "${OUTPUT_FILE}"`);
  await writePrefix();
  const files = await readdir(TEMPLATE_DIR);
  for (const file of files) {
    if (file === 'index.html') {
      continue;
    }
    console.log(`Appending template: ${file}`);
    const content = await getContent(file);
    await writeBody(content);
  }
  await writeSuffix();
})();
