const _ = require('lodash');
const db = require('./db');
const logger = require('./lib/logger');
const translationUtils = require('@medic/translation-utils');
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
  return translationUtils
    .getTranslationDocs(db, logger)
    .then(docs => {
      docs.forEach(doc => {
        const values = Object.assign(doc.generic, doc.custom || {});
        translations[doc.code] = translationUtils.loadTranslations(values);
      });
    })
    .catch(err => {
      logger.error('Error loading translations - starting up anyway: %o', err);
    });
};

const initFeed = () => {
  db.medic
    .changes({ live: true, since: 'now' })
    .on('change', async (change) => {
      if (change.id === 'settings') {
        logger.info('Reloading configuration');
        return initConfig(change?.changes?.[0]?.rev);
      }

      if (change.id.startsWith('messages-')) {
        logger.info('Detected translations change - reloading');
        loadTranslations().then(() => initTransitionLib());
      }
    })
    .on('error', err => {
      logger.error('Error watching changes, restarting: %o', err);
      process.exit(1);
    });
};

const initConfig = (rev) => {
  return db.medic
    .get('settings', { rev })
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
      if (err.status === 404) {
        return initConfig(rev);
      }
      logger.error('%o', err);
      throw new Error('Error loading configuration');
    });
};

const initTransitionLib = () => {
  transitionsLib = require('@medic/transitions')(db, module.exports, logger);
};

module.exports = {
  _initConfig: initConfig,
  _initFeed: initFeed,
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
