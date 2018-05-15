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
    return getDoc().then(doc => doc.settings);
  },
  update: (body, replace) => {
    return getDoc().then(doc => {
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
