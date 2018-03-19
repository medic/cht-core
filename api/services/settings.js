const db = require('../db-pouch');

const isObject = obj => obj === Object(obj) && !Array.isArray(obj);

const getDdoc = () => db.medic.get('_design/medic');

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
  get: ({ includeSchema }) => {
    return getDdoc().then(ddoc => {
        if (includeSchema) {
          const meta = ddoc.kanso || ddoc.couchapp;
          return {
            settings: ddoc.app_settings,
            meta: meta,
            schema: meta && meta.config && meta.config.settings_schema
          };
        }
        return ddoc.app_settings;
      });
  },
  update: ({ body, replace }) => {
    return getDdoc().then(ddoc => {
      if (replace) {
        doReplace(ddoc.app_settings, body);
      } else {
        doExtend(ddoc.app_settings, body);
      }
      return db.medic.put(ddoc);
    });
  }
};
