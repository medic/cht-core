var path = require('path'),
    db = require('../db');

module.exports = {
  name: 'emit-complete',
  created: new Date(2017, 2, 27),
  run: function(callback) {
    db.getSettings(function(err, data) {
      if (err) {
        return callback(err);
      }
      var rules = data.settings.tasks && data.settings.tasks.rules;
      if (!rules) {
        // no rules configured
        return callback();
      }

      if (rules.indexOf('_complete') !== -1) {
        // complete task already configured
        return callback();
      }

      rules = rules.replace(/(.*)\}[ \n\t]*\}[ \n\t]*$/, '$1 emit("_complete", { _id: true });}}');
      var opts = {
        path: path.join(db.getPath(), 'update_settings', db.settings.ddoc),
        method: 'put',
        body: { tasks: { rules: rules } }
      };
      db.request(opts, callback);
    });
  }
};