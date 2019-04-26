const {log, error, mkdir, extractPlaceholders} = require('./utils');
const fs = require('fs');
const chalk = require('chalk');

const fileExists = (fpath) => {
  const file = `${process.cwd()}/${fpath}`;
  const valid = fs.existsSync(file);
  if(!valid) {
    error(`Unable to find your translation file:\n${file}`);
  }
  return valid;
};

const hasValidName = (fpath) => {
  const valid = fpath.indexOf('-') >= 0 && fpath.indexOf('.') >= 0;
  if(!valid) {
    error(`Unexpected filename: ${fpath}`);
    log('Please rename to <some-name>-<language-code>.<extension>');
  }
  return valid;
};

const validTranslations = (fpath) => {
  return fileExists(fpath) && hasValidName(fpath);
};

const validDirectory = (fpath) => {
  const valid = mkdir(fpath);
  if(!valid) {
    error(`Unable to access directory ${fpath}`);
  }
  return valid;
};

const validatePlaceHolders = (langs, dir) => {
  const templateFile = `${dir}/messages-en.properties`;
  langs.filter(lang => lang !== 'en').forEach(lang => {
    const file = `${dir}/messages-${lang}.properties`;
    const translations = extractPlaceholders(file);
    const translationsTemplate = extractPlaceholders(templateFile);
    translations.map((e1) => {
      const e2 = translationsTemplate.find(t => t.key === e1.key);
      if (e1.match.toString() !== e2.match.toString()) {
        console.log(`\n${chalk.yellow('Warning: ')}${chalk.red(`messages-${lang}.properties: `)}Translation key ${chalk.green(e1.key)} on line ${chalk.red(e1.index + 1)} has placeholders that do not match those of messages-en.properties`);
      }
    });
  });
};

module.exports = {
  validTranslations: (fpath) => validTranslations(fpath),
  validDirectory: (fpath) => validDirectory(fpath),
  validatePlaceHolders: (lang, fpath) => validatePlaceHolders(lang, fpath)
};
