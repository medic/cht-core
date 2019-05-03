const _ = require('underscore'),
  db = require('./db'),
  ddocExtraction = require('./ddoc-extraction'),
  resourceExtraction = require('./resource-extraction'),
  translations = require('./translations'),
  defaults = require('./config.default.json'),
  settingsService = require('./services/settings'),
  translationCache = {},
  logger = require('./logger'),
  viewMapUtils = require('@medic/view-map-utils'),
  translationUtils = require('@medic/translation-utils');

let settings = {},
    transitionsLib;

const getMessage = (value, locale) => {
  const _findTranslation = (value, locale) => {
    if (value.translations) {
      const translation = _.findWhere(value.translations, { locale: locale });
      return translation && translation.content;
    } else {
      // fallback to old translation definition to support
      // backwards compatibility with existing forms
      return value[locale];
    }
  };

  if (!_.isObject(value)) {
    return value;
  }

  let test = false;
  if (locale === 'test') {
    test = true;
    locale = 'en';
  }

  let result =
    // 1) Look for the requested locale
    _findTranslation(value, locale) ||
    // 2) Look for the default
    value.default ||
    // 3) Look for the English value
    _findTranslation(value, 'en') ||
    // 4) Look for the first translation
    (value.translations &&
      value.translations[0] &&
      value.translations[0].content) ||
    // 5) Look for the first value
    value[_.first(_.keys(value))];

  if (test) {
    result = '-' + result + '-';
  }

  return result;
};

const loadSettings = function() {
  return settingsService.get().then(newSettings => {
    settings = newSettings || {};
    const original = JSON.stringify(settings);
    _.defaults(settings, defaults);
    // add any missing permissions
    if (settings.permissions) {
      _.defaults(settings.permissions, defaults.permissions);
    } else {
      settings.permissions = defaults.permissions;
    }
    if (JSON.stringify(settings) !== original) {
      logger.info('Updating settings with new defaults');
      return settingsService.update(settings);
    }
  });
};

const initTransitionLib = () => {
  transitionsLib = require('@twd/transitions')(db, settings, translationCache, logger);
  // loadTransitions could throw errors when some transitions are misconfigured
  try {
    transitionsLib.loadTransitions(true);
  } catch(err) {
    logger.error(err);
  }
};

const loadTranslations = () => {
  const options = { key: ['translations', true], include_docs: true };
  return db.medic
    .query('medic-client/doc_by_type', options)
    .then(result => {
      result.rows.forEach(row => {
        // If the field generic does not exist then we assume that the translation document
        // has not been converted to the new format so we will use the field values
        const values = row.doc.generic ? Object.assign(row.doc.generic, row.doc.custom || {}) : row.doc.values;
        translationCache[row.doc.code] = translationUtils.loadTranslations(values);
      });
    })
    .catch(err => {
      logger.error('Error loading translations - starting up anyway: %o', err);
    });
};

const loadViewMaps = () => {
  db.medic.get('_design/medic', function(err, ddoc) {
    if (err) {
      logger.error('Error loading view maps for medic ddoc', err);
      return;
    }
    viewMapUtils.loadViewMaps(
      ddoc,
      'docs_by_replication_key',
      'contacts_by_depth'
    );
  });
};

module.exports = {
  get: key => (key ? settings[key] : settings),
  translate: (key, locale, ctx) => {
    if (_.isObject(locale)) {
      ctx = locale;
      locale = null;
    }
    locale = locale || (settings && settings.locale) || 'en';
    if (_.isObject(key)) {
      return getMessage(key, locale) || key;
    }
    const value =
      (translationCache[locale] && translationCache[locale][key]) ||
      (translationCache.en && translationCache.en[key]) ||
      key;
    // underscore templates will return ReferenceError if all variables in
    // template are not defined.
    try {
      return _.template(value)(ctx || {});
    } catch (e) {
      return value;
    }
  },
  load: () => {
    loadViewMaps();
    return Promise.all([ loadTranslations(), loadSettings() ]).then(() => initTransitionLib());
  },
  listen: () => {
    db.medic
      .changes({ live: true, since: 'now', return_docs: false })
      .on('change', change => {
        if (change.id === '_design/medic') {
          logger.info('Detected ddoc change - reloading');
          translations.run().catch(err => {
            logger.error('Failed to update translation docs: %o', err);
          });
          ddocExtraction.run().catch(err => {
            logger.error('Something went wrong trying to extract ddocs: %o', err);
            process.exit(1);
          });
          resourceExtraction.run().catch(err => {
            logger.error('Something went wrong trying to extract resources: %o', err);
            process.exit(1);
          });
          loadViewMaps();
        } else if (change.id === 'settings') {
          logger.info('Detected settings change - reloading');
          loadSettings()
            .catch(err => {
              logger.error('Failed to reload settings: %o', err);
              process.exit(1);
            })
            .then(() => initTransitionLib());
        } else if (change.id.indexOf('messages-') === 0) {
          logger.info('Detected translations change - reloading');
          loadTranslations().then(() => initTransitionLib());
        }
      })
      .on('error', err => {
        logger.error('Error watching changes, restarting: %o', err);
        process.exit(1);
      });
  },
  initTransitionLib: initTransitionLib,
  getTransitionsLib: () => transitionsLib
};
