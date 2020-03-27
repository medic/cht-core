const db = require('../db');
const {promisify} = require('util');
const settingsService = require('../services/settings');

module.exports = {
  name: 'extract-settings',
  created: new Date(2000, 1, 1), // really early so it runs first
  run: promisify(callback => {
    return db.medic.get('_design/medic')
      .then(ddoc => {
        if (ddoc.app_settings) {
          return settingsService.update(ddoc.app_settings)
            .then(() => {
              delete ddoc.app_settings;
              return db.medic.put(ddoc);
            });
        }
      })
      .then(() => {
        callback();
      })
      .catch(callback);
  })
};
