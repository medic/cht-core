const utils = require('./utils');
const fs = require('fs');
const {
  checkTranslations,
  TranslationException
} = require('translation-checker');
const MessageFormat = require('messageformat');

const MFORMAT = new MessageFormat('en');
const transErrorsMsg = MFORMAT
  .compile('There {ERRORS, plural, one{was 1 error} other{were # errors}} trying to compile');
const transEmptyMsg = MFORMAT
  .compile('There {EMPTIES, plural, one{was 1 empty translation} other{were # empty translations}} trying to compile');

const fileExists = (fpath) => {
  const file = `${process.cwd()}/${fpath}`;
  const valid = fs.existsSync(file);
  if(!valid) {
    utils.error(`Unable to find your translation file:\n${file}`);
  }
  return valid;
};

const hasValidName = (fpath) => {
  const valid = fpath.indexOf('-') >= 0 && fpath.indexOf('.') >= 0;
  if(!valid) {
    utils.error(`Unexpected filename: ${fpath}`);
    utils.log('Please rename to <some-name>-<language-code>.<extension>');
  }
  return valid;
};

const validTranslations = (fpath) => {
  return fileExists(fpath) && hasValidName(fpath);
};

const validDirectory = (fpath) => {
  const valid = utils.mkdir(fpath);
  if(!valid) {
    utils.error(`Unable to access directory ${fpath}`);
  }
  return valid;
};

const validatePlaceHolders = async (langs, dir) => {
  let formatErrorsFound = 0;
  let placeholderErrorsFound = 0;
  let emptiesFound = 0;
  try {
    await checkTranslations(
      dir,
      {
        checkPlaceholders: true,
        languages: langs.concat('ex')
      }
    );
  } catch (err) {
    if (err instanceof TranslationException) {
      if (!err.errors) {
        return utils.error('Exception checking translations:', err.message);
      }
      for (const e of err.errors) {
        switch (e.error) {
        case 'cannot-access-dir':
          return utils.log('Could not find custom translations dir:', dir);
        case 'missed-placeholder':
        case 'wrong-placeholder':
          placeholderErrorsFound++;
          utils.error(e.message);
          break;
        case 'empty-message':
          emptiesFound++;
          break;
        case 'wrong-messageformat':
          formatErrorsFound++;
          utils.error(e.message);
          break;
        case 'wrong-file-name':
          utils.warn(e.message);
          break;
        default:  // No more know options, just in case ...
          utils.error(e.message);
        }
      }
      if (emptiesFound > 0) {
        utils.info(transEmptyMsg({EMPTIES: emptiesFound}));
      }
      if (formatErrorsFound > 0 || placeholderErrorsFound > 0) {
        let errMsg = transErrorsMsg({ERRORS: formatErrorsFound + placeholderErrorsFound});
        if (placeholderErrorsFound > 0) {
          errMsg += '\nYou can use messages-ex.properties to add placeholders missing from the reference context.';
        }
        utils.error(errMsg);
        return false;
      }
    } else {
      throw err;
    }
  }
  return true;
};

module.exports = {
  validTranslations,
  validDirectory,
  validatePlaceHolders
};
