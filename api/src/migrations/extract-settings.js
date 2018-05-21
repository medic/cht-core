const db = require('../db-pouch'),
      settingsService = require('../services/settings');

module.exports = {
  name: 'extract-settings',
  created: new Date(2000, 1, 1), // really early so it runs first
  run: callback => {
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
  }
};
