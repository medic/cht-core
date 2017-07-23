const _ = require('underscore'),
      follow = require('follow'),
      db = require('./db'),
      logger = require('./lib/logger'),
      defaults = require('./defaults'),
      translations = {},
      SETTINGS_PATH = '_design/medic/_rewrite/app_settings/medic';

let config = require('./defaults');

const loadTranslations = () => {
  const options = {
    startkey: [ 'translations', false ],
    endkey: [ 'translations', true ],
    include_docs: true
  };
  db.medic.view('medic-client', 'doc_by_type', options, (err, result) => {
    if (err) {
      logger.error('Error loading translations - starting up anyway', err);
      return;
    }
    result.rows.forEach(row => translations[row.doc.code] = row.doc.values );
  });
};

const initFeed = () => {
  // Use since=now on ddoc listener so we don't replay an old change.
  const feed = new follow.Feed({ db: process.env.COUCH_URL, since: 'now' });
  feed.on('change', change => {
    if (change.id === '_design/medic') {
      logger.info('Reloading configuration');
      initConfig();
    } else if (change.id.startsWith('messages-')) {
      logger.info('Detected translations change - reloading');
      loadTranslations();
    }
  });
  feed.follow();
};

const initConfig = () => {
  db.medic.get(SETTINGS_PATH, (err, data) => {
    if (err) {
      console.error('Error loading configuration. Exiting...');
      process.exit(0);
    }
    _.defaults(data.settings, defaults);
    config = data.settings;
    logger.debug(
      'Reminder messages allowed between %s:%s and %s:%s',
      config.schedule_morning_hours,
      config.schedule_morning_minutes,
      config.schedule_evening_hours,
      config.schedule_evening_minutes
    );
    require('./transitions').loadTransitions();
  });
};

module.exports = {
  _initConfig: initConfig,
  _initFeed: initFeed,
  get: key => {
    return config[key];
  },
  getTranslations: () => {
    return translations;
  },
  init: () => {
    initFeed();
    loadTranslations();
    initConfig();
  }
};
