const _ = require('underscore'),
      defaults = require('../config.default.json'),
      db = require('../db'),
      logger = require('../logger');

const isObject = obj => obj === Object(obj) && !Array.isArray(obj);

const getDoc = () => db.medic.get('settings');

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
   * @param replace If true, recursively merges the properties.
   */
  update: (body, replace) => {
    return getDoc()
      .catch(err => {
        if (err.status === 404) {
          return { _id: 'settings' };
        }
        throw err;
      })
      .then(doc => {
        if (!doc.settings) {
          doc.settings = {};
        }

        const original = JSON.stringify(doc.settings);

        if (replace) {
          doReplace(doc.settings, body);
        } else {
          doExtend(doc.settings, body);
        }

        if (doc.settings.permissions) {
          _.defaults(doc.settings.permissions, defaults.permissions);
        } else {
          doc.settings.permissions = defaults.permissions;
        }

        if (doc.settings.contact_types) {
          _.defaults(doc.settings.contact_types, defaults.contact_types);
        } else {
          doc.settings.contact_types = defaults.contact_types;
        }
        
        if (JSON.stringify(doc.settings) !== original) {
          logger.info('Updating settings with new defaults');
          return db.medic.put(doc);
        } 
        
        return Promise.resolve();
      });
  }
};
