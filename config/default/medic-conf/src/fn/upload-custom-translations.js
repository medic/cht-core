const semver = require('semver');

const environment = require('../lib/environment');
const pouch = require('../lib/db');
const getApiVersion = require('../lib/get-api-version');
const iso639 = require('iso-639-1');
const log = require('../lib/log');
const properties = require('properties');
const warnUploadOverwrite = require('../lib/warn-upload-overwrite');
const {
  checkTranslations,
  isLanguageCodeValid,
  TranslationException
} = require('@medic/translation-checker');

const execute = async () => {
  const db = pouch(environment.apiUrl);

  const dir = `${environment.pathToProject}/translations`;

  let fileNames;
  let formatErrorsFound = 0;
  let placeholderErrorsFound = 0;
  let emptiesFound = 0;
  try {
    // if environment.skipTranslationCheck is true then only
    // directory access and file names are checked
    fileNames = await checkTranslations(dir, {
      checkPlaceholders: !environment.skipTranslationCheck,
      checkMessageformat: !environment.skipTranslationCheck,
      checkEmpties: !environment.skipTranslationCheck
    });
  } catch (err) {
    if (err instanceof TranslationException) {
      fileNames = err.fileNames;
      if (!err.errors) {
        return log.error('Exception checking translations:', err.message);
      }
      for (const error of err.errors) {
        switch (error.error) {
          case 'cannot-access-dir':
            return log.warn('Could not find custom translations dir:', dir);
          case 'missed-placeholder':
          case 'wrong-placeholder':
            placeholderErrorsFound++;
            log.error(error.message);
            break;
          case 'empty-message':
            emptiesFound++;
            log.warn(error.message);
            break;
          case 'wrong-messageformat':
            formatErrorsFound++;
            log.error(error.message);
            break;
          default:  // 'wrong-file-name', ...
            log.error(error.message);
        }
      }
      if (emptiesFound > 0) {
        log.warn(`Found ${emptiesFound} empty messages trying to compile translations`);
      }
      if (formatErrorsFound > 0 || placeholderErrorsFound > 0) {
        let errMsg = `Found ${formatErrorsFound + placeholderErrorsFound} errors trying to compile translations`;
        if (placeholderErrorsFound > 0) {
          errMsg += '\nYou can use messages-ex.properties to add placeholders missing from the reference context.';
        }
        log.error(errMsg);
        return process.exit(-1);
      }
    } else {
      throw err;
    }
  }

  for (let fileName of fileNames) {
    const id = idFor(fileName);
    const languageCode = id.substring('messages-'.length);
    if (!isLanguageCodeValid(languageCode)) {
      log.error(`The language code '${languageCode}' is not valid. It must begin with a letter(a–z, A-Z), followed by any number of hyphens, underscores, letters, or numbers.`);
      return process.exit(-1);
    }

    let languageName = iso639.getName(languageCode);
    if (!languageName) {
      log.warn(`'${languageCode}' is not a recognized ISO 639 language code, please ask admin to set the name`);
      languageName = 'TODO: please ask admin to set this in settings UI';
    } else {
      let languageNativeName = iso639.getNativeName(languageCode);
      if (languageNativeName !== languageName){
        languageName = `${languageNativeName} (${languageName})`;
      }
    }

    const translations = await parse(`${dir}/${fileName}`, { path: true });

    let doc;
    try {
      doc = await db.get(id);
    } catch(e) {
      if (e.status === 404) {
        doc = await newDocFor(fileName, db, languageName, languageCode);
      }
      else throw e;
    }

    overwriteProperties(doc, translations);

    const changes = await warnUploadOverwrite.preUploadDoc(db, doc);

    if (changes) {
      await db.put(doc);
      log.info(`Translation ${dir}/${fileName} uploaded`);
    } else {
      log.info(`Translation ${dir}/${fileName} not uploaded as no changes were found`);
    }

    await warnUploadOverwrite.postUploadDoc(db, doc);
  }
};

function parse(filePath, options) {
  return new Promise((resolve, reject) => {
    properties.parse(filePath, options, (err, parsed) => {
      if (err) return reject(err);
      resolve(parsed);
    });
  });
}

function overwriteProperties(doc, props) {
  if(doc.generic) {
    // 3.4.0 translation structure
    doc.custom = props;
  } else if (doc.values) {
    // pre-3.4.0 doc structure
    for (const [key, value] of Object.entries(props)) {
      doc.values[key] = value;
    }
  } else {
    throw new Error(`Existent translation doc ${doc._id} is malformed`);
  }

  return doc;
}

async function newDocFor(fileName, db, languageName, languageCode) {
  const doc = {
    _id: idFor(fileName),
    type: 'translations',
    code: languageCode,
    name: languageName,
    enabled: true,
  };

  const useGenericTranslations = await genericTranslationsStructure(db);
  if (useGenericTranslations) {
    doc.generic = {};
  } else {
    doc.values = {};
  }

  return doc;
}

function idFor(fileName) {
  return fileName.substring(0, fileName.length - 11);
}

async function genericTranslationsStructure(db) {
  const version = await getApiVersion();

  if (semver.valid(version)) {
    return semver.gte(version, '3.4.0');
  }

  return db.get('messages-en')
    .then(doc => doc.generic)
    .catch(() => false);
}

module.exports = {
  requiresInstance: true,
  execute
};
