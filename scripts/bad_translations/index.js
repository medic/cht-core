const parser = require('properties-parser');

const ROOT = '../../webapp/src/ddocs/medic/_attachments/translations';

const english = parser.read(`${ROOT}/messages-en.properties`);
const langs = [
  'bm',
  'es',
  'fr',
  'hi',
  'id',
  'ne',
  'sw'
];

const theRest = {};
langs.forEach(
  lang => theRest[lang] = parser.read(`${ROOT}/messages-${lang}.properties`));

const templatedKeys = Object.keys(english)
  .filter(k => english[k].includes('{{'));

const missingTemplatedKeys = {};

templatedKeys.forEach(tKey =>
  Object.keys(theRest).forEach(lang => {
    if (theRest[lang][tKey] && !theRest[lang][tKey].includes('{{')) {
      if (!missingTemplatedKeys[tKey]) {
        missingTemplatedKeys[tKey] = [];
      }

      missingTemplatedKeys[tKey].push(lang);
    }
  }));

console.log(JSON.stringify(missingTemplatedKeys, null, 2));
