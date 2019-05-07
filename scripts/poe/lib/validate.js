const {log, error, mkdir, extractPlaceholders} = require('./utils');
const fs = require('fs');

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
  let valid = true;
  const templateFile = `${dir}/messages-en.properties`;
  const templatePlaceholders = extractPlaceholders(templateFile);
  langs.filter(lang => lang !== 'en').forEach(lang => {
    const file = `${dir}/messages-${lang}.properties`;
    const placeholders = extractPlaceholders(file);
    Object.keys(placeholders).forEach(k => {
      const placeholder = placeholders[k];
      const templatePlaceholder = templatePlaceholders[k];
      if (placeholder.placeholders.toString() !== templatePlaceholder.placeholders.toString()) {
        valid = false;
        console.error(`\nFAILURE: messages-${lang}.properties: Translation key ${k} on line ${placeholder.index + 1} has placeholders that do not match those of messages-en.properties`);
      }
    });
  });
  return valid;
};

module.exports = {
  validTranslations: (fpath) => validTranslations(fpath),
  validDirectory: (fpath) => validDirectory(fpath),
  validatePlaceHolders: (lang, fpath) => validatePlaceHolders(lang, fpath)
};
