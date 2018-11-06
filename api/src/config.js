const _ = require('underscore'),
  db = require('./db-pouch'),
  ddocExtraction = require('./ddoc-extraction'),
  translations = require('./translations'),
  defaults = require('./config.default.json'),
  settingsService = require('./services/settings'),
  translationCache = {},
  logger = require('./logger'),
  viewMapUtils = require('@shared-libs/view-map-utils');

let settings = {};

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
      defaults.permissions.forEach(function(def) {
        const configured = _.findWhere(settings.permissions, {
          name: def.name,
        });
        if (!configured) {
          settings.permissions.push(def);
        }
      });
    } else {
      settings.permissions = defaults.permissions;
    }
    if (JSON.stringify(settings) !== original) {
      logger.info('Updating settings with new defaults');
      return settingsService.update(settings);
    }
  });
};

const loadTranslations = () => {
  const options = { key: ['translations', true], include_docs: true };
  db.medic.query('medic-client/doc_by_type', options, (err, result) => {
    if (err) {
      logger.error('Error loading translations - starting up anyway: %o', err);
      return;
    }
    result.rows.forEach(row => {
      translationCache[row.doc.code] = row.doc.values;
    });
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
    loadTranslations();
    loadViewMaps();
    return loadSettings();
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
          loadViewMaps();
        } else if (change.id === 'settings') {
          logger.info('Detected settings change - reloading');
          loadSettings().catch(err => {
            logger.error('Failed to reload settings: %o', err);
            process.exit(1);
          });
        } else if (change.id.indexOf('messages-') === 0) {
          logger.info('Detected translations change - reloading');
          loadTranslations();
        }
      })
      .on('error', err => {
        logger.error('Error watching changes, restarting: %o', err);
        process.exit(1);
      });
  },
};
