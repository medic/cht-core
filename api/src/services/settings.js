const db = require('../db-pouch');

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
        if (replace) {
          doReplace(doc.settings, body);
        } else {
          doExtend(doc.settings, body);
        }
        return db.medic.put(doc);
      });
  }
};
