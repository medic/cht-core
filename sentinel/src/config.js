const _ = require('lodash');
const db = require('./db');
const logger = require('@medic/logger');
const translationUtils = require('@medic/translation-utils');
const { DOC_IDS, DOC_TYPES } = require('@medic/constants');
const translations = {};

const DEFAULT_CONFIG = {
  schedule_morning_hours: 0,
  schedule_morning_minutes: 0,
  schedule_evening_hours: 23,
  schedule_evening_minutes: 0,
  synthetic_date: null,
  transitions: {},
  loglevel: 'info',
};

let config = DEFAULT_CONFIG;
let transitionsLib;

const loadTranslations = () => {
  const options = {
    key: [DOC_TYPES.TRANSLATIONS],
    include_docs: true,
  };
  return db.medic
    .query('shared/doc_by_type', options)
    .then(result => {
      result.rows.forEach(row => {
        const values = Object.assign(row.doc.generic, row.doc.custom || {});
        translations[row.doc.code] = translationUtils.loadTranslations(values);
      });
    })
    .catch(err => {
      logger.error('Error loading translations - starting up anyway: %o', err);
    });
};

const initFeed = () => {
  db.medic
    .changes({ live: true, since: 'now' })
    .on('change', change => {
      if (change.id === DOC_IDS.SETTINGS) {
        logger.info('Reloading configuration');
        initConfig();
      } else if (change.id.startsWith('messages-')) {
        logger.info('Detected translations change - reloading');
        loadTranslations().then(() => initTransitionLib());
      }
    })
    .on('error', err => {
      logger.error('Error watching changes, restarting: %o', err);
      process.exit(1);
    });
};

const initConfig = () => {
  return db.medic
    .get(DOC_IDS.SETTINGS)
    .then(doc => {
      _.defaults(doc.settings, DEFAULT_CONFIG);
      config = doc.settings;
      initTransitionLib();
      require('./transitions').loadTransitions();
      logger.debug(
        'Reminder messages allowed between %s:%s and %s:%s',
        config.schedule_morning_hours,
        config.schedule_morning_minutes,
        config.schedule_evening_hours,
        config.schedule_evening_minutes
      );
    })
    .catch(err => {
      logger.error('%o', err);
      throw new Error('Error loading configuration');
    });
};

const initTransitionLib = () => {
  transitionsLib = require('@medic/transitions')(db, module.exports, require('./data-context'));
};

module.exports = {
  get: key => (key ? config[key] : config),
  getAll: () => config,
  getTranslations: () => {
    return translations;
  },
  init: () => {
    initFeed();
    return loadTranslations().then(initConfig);
  },
  initTransitionLib: initTransitionLib,
  getTransitionsLib: () => transitionsLib
};
