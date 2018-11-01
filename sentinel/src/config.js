const _ = require('underscore'),
  db = require('./db-pouch'),
  logger = require('./lib/logger'),
  translations = {};

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

const loadTranslations = () => {
  const options = {
    startkey: ['translations', false],
    endkey: ['translations', true],
    include_docs: true,
  };
  return db.medic
    .query('medic-client/doc_by_type', options)
    .then(result => {
      result.rows.forEach(row => (translations[row.doc.code] = row.doc.values));
    })
    .catch(err => {
      logger.error('Error loading translations - starting up anyway: %o', err);
    });
};

const initFeed = () => {
  db.medic
    .changes({ live: true, since: 'now' })
    .on('change', change => {
      if (change.id === 'settings') {
        logger.info('Reloading configuration');
        initConfig();
      } else if (change.id.startsWith('messages-')) {
        logger.info('Detected translations change - reloading');
        loadTranslations();
      }
    })
    .on('error', err => {
      logger.error('Error watching changes, restarting: %o', err);
      process.exit(1);
    });
};

const initConfig = () => {
  return db.medic
    .get('settings')
    .then(doc => {
      _.defaults(doc.settings, DEFAULT_CONFIG);
      config = doc.settings;
      logger.debug(
        'Reminder messages allowed between %s:%s and %s:%s',
        config.schedule_morning_hours,
        config.schedule_morning_minutes,
        config.schedule_evening_hours,
        config.schedule_evening_minutes
      );
      require('./transitions').loadTransitions();
    })
    .catch(err => {
      logger.error('%o', err);
      throw new Error('Error loading configuration');
    });
};

module.exports = {
  _initConfig: initConfig,
  _initFeed: initFeed,
  get: key => {
    return config[key];
  },
  getAll: () => config,
  getTranslations: () => {
    return translations;
  },
  init: () => {
    initFeed();
    return loadTranslations().then(initConfig);
  },
};
