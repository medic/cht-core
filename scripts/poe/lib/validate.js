const {log, error, mkdir, sanitize} = require('./utils');
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

const hasValidLine = (line, idx) => {
  if(!line.trim().length) {
    return true;
  }
  const valid = line.indexOf('=') > 0;
  if(!valid) {
    error(`line ${idx} - Found invalid translation:\n${line}`);
  }
  return valid;
};

const hasValidContent = (fpath) => {
  const tempFPath = sanitize(fpath);
  const content = fs.readFileSync(tempFPath, 'utf8');
  let valid = true;
  content.toString().split('\n').some((line, idx) => {
    if (!hasValidLine(line, idx)) {
      valid = false;
      return true;
    }
  });
  return valid;
};

const validTranslations = (fpath) => {
  return fileExists(fpath) && hasValidName(fpath) && hasValidContent(fpath);
};

const validDirectory = (fpath) => {
  const valid = mkdir(fpath);
  if(!valid) {
    error(`Unable to access directory ${fpath}`);
  }
  return valid;
};

module.exports = {
  validTranslations: (fpath) => validTranslations(fpath),
  validDirectory: (fpath) => validDirectory(fpath)
};
