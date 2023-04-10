const _ = require('lodash');
const properties = require('properties');
const db = require('./db');
const environment = require('./environment');
const fs = require('fs');
const logger = require('./logger');
const util = require('util');
const path = require('path');
const settingsService = require('./services/settings');

const TRANSLATION_FILE_NAME_REGEX = /messages-([a-z]*)\.properties/;
const DOC_TYPE = 'translations';
const MESSAGES_DOC_ID_PREFIX = 'messages-';

const parseProperties = util.promisify(properties.parse);

const LOCAL_NAME_MAP = {
  bm: 'Bamanankan (Bambara)',
  en: 'English',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  ne: 'नेपाली (Nepali)',
  sw: 'Kiswahili (Swahili)',
  hi: 'हिन्दी (Hindi)',
  id: 'Bahasa Indonesia (Indonesian)',
  lg: 'Luganda (Ganda)'
};

const extractLocaleCode = filename => {
  const parts = TRANSLATION_FILE_NAME_REGEX.exec(filename);
  if (parts && parts[1]) {
    return parts[1].toLowerCase();
  }
};

const validTranslationsDoc = doc => {
  if (!doc || doc.type !== DOC_TYPE || !doc.code) {
    return false;
  }

  if (_.isObject(doc.generic) || _.isObject(doc.values)) {
    return true;
  }

  logger.warn(`Failed to load translations for "${doc.code}"("${doc.name}"). Translations document malformed.`);
  return false;
};

const createDoc = attachment => {
  return {
    _id: `${MESSAGES_DOC_ID_PREFIX}${attachment.code}`,
    type: DOC_TYPE,
    code: attachment.code,
    name: LOCAL_NAME_MAP[attachment.code] || attachment.code,
    enabled: true,
    generic: attachment.generic
  };
};

const overwrite = (translationFiles, docs) => {
  const updatedDocs = [];
  const english = translationFiles.find(file => file.code === 'en');
  const knownKeys = english ? Object.keys(english.generic) : [];

  translationFiles.forEach(file => {
    const code = file.code;
    if (!code) {
      return;
    }
    knownKeys.forEach(knownKey => {
      const value = file.generic[knownKey];
      if (_.isUndefined(value) || value === null) {
        file.generic[knownKey] = knownKey;
      } else if (typeof value !== 'string') {
        file.generic[knownKey] = String(value);
      }
    });

    const doc = docs.find(doc => doc.code === code);
    if (!doc) {
      updatedDocs.push(createDoc(file));
      return;
    }

    if (!_.isEqual(doc.generic, file.generic)) {
      // backup the modified attachment
      doc.generic = file.generic;
      updatedDocs.push(doc);
    }
  });
  return updatedDocs;
};

const getTranslationDocs = async () => {
  return db.medic
    .allDocs({ startkey: MESSAGES_DOC_ID_PREFIX, endkey: `${MESSAGES_DOC_ID_PREFIX}\ufff0`, include_docs: true })
    .then(response => {
      return response.rows
        .map(row => row.doc)
        .filter(doc => validTranslationsDoc(doc));
    });
};

const getEnabledLocaleCodes = (languages, translationDocs) => {
  if (
    languages &&
    Array.isArray(languages) &&
    languages.length > 0
  ) {
    return languages.filter(language => language.enabled !== false).map(language => language.locale);
  }

  return translationDocs.filter(doc => doc.enabled).map(doc => doc.code);
};

const getEnabledLocales = async () => {
  const [settings, translationDocs] = await Promise.all([settingsService.get(), getTranslationDocs()]);
  const enabledLocaleCodes = getEnabledLocaleCodes(settings.languages, translationDocs);
  return translationDocs.filter(doc => enabledLocaleCodes.includes(doc.code));
};

const readTranslationFile = (fileName, folderPath) => {
  const filePath = path.join(folderPath, fileName);
  return fs.promises
    .readFile(filePath, 'utf8')
    .then(fileContents => parseProperties(fileContents))
    .then(values => ({
      code: extractLocaleCode(fileName),
      generic: values
    }));
};

const getTranslationFiles = () => {
  const translationsPath = path.join(environment.resourcesPath, 'translations');
  return fs.promises.readdir(translationsPath).then(files => {
    const translationsFiles = files.filter(file => file && file.match(TRANSLATION_FILE_NAME_REGEX));
    return Promise.all(translationsFiles.map(fileName => readTranslationFile(fileName, translationsPath)));
  });
};

module.exports = {
  run: () => {
    return getTranslationFiles().then(files => {
      if (!files.length) {
        return;
      }

      return getTranslationDocs()
        .then((docs) => overwrite(files, docs))
        .then(updated => {
          if (updated.length) {
            return db.medic.bulkDocs(updated);
          }
        });
    });
  },
  getEnabledLocales,
  getTranslationDocs,
};
