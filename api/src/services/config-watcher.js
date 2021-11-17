const db = require('../db');
const logger = require('../logger');
const translationUtils = require('@medic/translation-utils');
const tombstoneUtils = require('@medic/tombstone-utils');
const viewMapUtils = require('@medic/view-map-utils');
const settingsService = require('./settings');
const translations = require('../translations');
const ddocExtraction = require('../ddoc-extraction');
const generateXform = require('./generate-xform');
const generateServiceWorker = require('../generate-service-worker');
const manifest = require('./manifest');
const config = require('../config');

const MEDIC_DDOC_ID = '_design/medic';

const loadTranslations = () => {
  const translationCache = {};
  const options = { key: ['translations', true], include_docs: true };
  return db.medic
    .query('medic-client/doc_by_type', options)
    .catch(err => {
      logger.error('Error loading translations - starting up anyway: %o', err);
    })
    .then(result => {
      if (!result) {
        return;
      }
      result.rows.forEach(row => {
        // If the field generic does not exist then we assume that the translation document
        // has not been converted to the new format so we will use the field values
        const values = row.doc.generic ? Object.assign(row.doc.generic, row.doc.custom || {}) : row.doc.values;
        translationCache[row.doc.code] = translationUtils.loadTranslations(values);
      });

      config.setTranslationCache(translationCache);
    });
};

const initTransitionLib = () => {
  const settings = config.get();
  const translationCache = config.getTranslationValues();
  const transitionsLib = require('@medic/transitions')(db, settings, translationCache, logger);
  // loadTransitions could throw errors when some transitions are misconfigured
  try {
    transitionsLib.loadTransitions(true);
  } catch(err) {
    logger.error(err);
  }
  config.setTransitionsLib(transitionsLib);
};

const loadViewMaps = () => {
  return db.medic
    .get(MEDIC_DDOC_ID)
    .then(ddoc => {
      viewMapUtils.loadViewMaps(
        ddoc,
        'docs_by_replication_key',
        'contacts_by_depth'
      );
    })
    .catch(err => {
      logger.error('Error loading view maps for medic ddoc: %o', err);
    });
};

const loadSettings = () => {
  return settingsService
    .update({})
    .then(() => settingsService.get())
    .then(settings => config.set(settings));
};


const handleDdocChange = () => {
  logger.info('Detected ddoc change - reloading');
  loadViewMaps();

  return translations
    .run()
    .catch(err => {
      logger.error('Failed to update translation docs: %o', err);
    })
    .then(() => ddocExtraction.run())
    .catch(err => {
      logger.error('Something went wrong trying to extract ddocs: %o', err);
      process.exit(1);
    })
    .catch(err => {
      logger.error('Something went wrong trying to extract resources: %o', err);
      process.exit(1);
    })
    .then(() => updateServiceWorker());
};

const handleSettingsChange = () => {
  logger.info('Detected settings change - reloading');
  return loadSettings()
    .catch(err => {
      logger.error('Failed to reload settings: %o', err);
      process.exit(1);
    })
    .then(() => initTransitionLib())
    .then(() => logger.debug('Settings updated'));
};

const handleTranslationsChange = () => {
  logger.info('Detected translations change - reloading');
  return loadTranslations()
    .then(() => initTransitionLib())
    .then(() => updateServiceWorker());
};

const handleFormChange = (change) => {
  if (change.deleted) {
    return Promise.resolve();
  }
  logger.info('Detected form change - generating attachments');
  return generateXform.update(change.id).catch(err => {
    logger.error('Failed to update xform: %o', err);
  });
};

const handleBrandingChanges = () => {
  return updateManifest()
    .then(() => updateServiceWorker());
};

const updateManifest = () => {
  return manifest.generate().catch(err => {
    logger.error('Failed to generate manifest: %o', err);
  });
};

const updateServiceWorker = () => {
  return generateServiceWorker.run().catch(err => {
    logger.error('Failed to generate service worker: %o', err);
    process.exit(1);
  });
};

const load = () => {
  loadViewMaps();
  return loadTranslations()
    .then(() => loadSettings())
    .then(() => initTransitionLib());
};

const listen = () => {
  db.medic
    .changes({ live: true, since: 'now', return_docs: false })
    .on('change', change => {

      if (tombstoneUtils.isTombstoneId(change.id)) {
        return Promise.resolve();
      }

      if (change.id === MEDIC_DDOC_ID) {
        return handleDdocChange();
      }

      if (change.id === settingsService.SETTINGS_DOC_ID) {
        return handleSettingsChange();
      }

      if (change.id.startsWith('messages-')) {
        return handleTranslationsChange();
      }

      if (change.id.startsWith('form:')) {
        return handleFormChange(change);
      }

      if (change.id === 'branding') {
        return handleBrandingChanges();
      }
    })
    .on('error', err => {
      logger.error('Error watching changes, restarting: %o', err);
      process.exit(1);
    });
};

module.exports = {
  load,
  listen,
};
