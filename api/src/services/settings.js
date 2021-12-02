const _ = require('lodash');
const path = require('path');

const db = require('../db');
const environment = require('../environment');
const { info } = require('../logger');

const isObject = obj => obj === Object(obj) && !Array.isArray(obj);

const SETTINGS_DOC_ID = 'settings';
const getDoc = () => db.medic.get(SETTINGS_DOC_ID);

const doReplace = (target, source) => {
  Object.keys(source).forEach(k => {
    target[k] = source[k];
  });
};

const doExtend = (target, source) => {
  Object.keys(source).forEach(k => {
    if (isObject(source[k])) {
      // object, recurse
      if (!target[k]) {
        target[k] = {};
      }
      doExtend(target[k], source[k]);
    } else {
      // simple property or array
      target[k] = source[k];
    }
  });
};

const getDeprecatedTransitions = () => {
  const transitions = require('@medic/transitions')();

  return transitions
    .getDeprecatedTransitions()
    .map(transition => {
      return {
        name: transition.name,
        deprecated: transition.deprecated,
        deprecatedIn: transition.deprecatedIn,
        deprecationMessage: transition.getDeprecationMessage ? transition.getDeprecationMessage() : ''
      };
    });
};

module.exports = {
  get: () => {
    return getDoc()
      .then(doc => doc.settings)
      .catch(err => {
        if (err.status === 404) {
          // TODO replace this once everyone is on 3.0+
          // return {};
          // check if the ddoc has legacy app_settings
          return db.medic.get('_design/medic')
            .then(ddoc => ddoc.app_settings || {});
        }
        throw err;
      });
  },
  /**
   * Process a request to either replace, overwrite or extend existing settings.
   * If both replace and overwrite are set, then it is assumed that only overwrite
   * is set.
   * @param replace If true, recursively merges the properties leaving existing
   *                properties not in the input document intact.
   * @param overwrite If true, replace the settings document with input document.
   * @returns Boolean whether or not settings doc has been updated
   */
  update: (body, replace, overwrite) => {
    const pathToDefaultConfig = path.join(environment.defaultDocsPath, 'settings.doc.json');
    const defaultConfig = require(pathToDefaultConfig);

    return getDoc()
      .catch(err => {
        if (err.status === 404) {
          return { _id: SETTINGS_DOC_ID };
        }
        throw err;
      })
      .then(doc => {
        if (!doc.settings) {
          doc.settings = {};
        }

        const original = JSON.stringify(doc.settings);

        if (overwrite) {
          doc.settings = body;
        } else if (replace) {
          doReplace(doc.settings, body);
        } else {
          doExtend(doc.settings, body);
        }

        if (doc.settings.permissions) {
          _.defaults(doc.settings.permissions, defaultConfig.permissions);
        } else {
          doc.settings.permissions = defaultConfig.permissions;
        }

        if (JSON.stringify(doc.settings) !== original) {
          info('Updating settings with new defaults');
          return db.medic.put(doc).then(() => true);
        }

        info('Not updating settings - the existing settings are already up to date');
        return Promise.resolve(false);
      });
  },
  getDeprecatedTransitions: getDeprecatedTransitions,
  SETTINGS_DOC_ID: SETTINGS_DOC_ID,
};
