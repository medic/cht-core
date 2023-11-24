const _ = require('lodash');
const properties = require('properties');
const db = require('./db');
const environment = require('./environment');
const fs = require('fs');
const logger = require('./logger');
const util = require('util');
const path = require('path');
const settingsService = require('./services/settings');
const translationUtils = require('@medic/translation-utils');

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
  const [settings, translationDocs] = await Promise.all([
    settingsService.get(),
    translationUtils.getTranslationDocs(db, logger),
  ]);
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

      return translationUtils.getTranslationDocs(db, logger)
        .then((docs) => overwrite(files, docs))
        .then(updated => {
          if (updated.length) {
            return db.medic.bulkDocs(updated);
          }
        });
    });
  },
  getEnabledLocales,
};
