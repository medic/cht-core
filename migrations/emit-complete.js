var path = require('path'),
    db = require('../db'),
    SETTINGS_REGEX = /(.*)(\}[ \n\t]*\}[ \n\t]*)$/,
    COMPLETE_EVENT_CONFIG = 'emit("_complete", { _id: true });';

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

      // find the last two braces in the app settings and insert the
      // configuration to emit the _complete event
      rules = rules.replace(SETTINGS_REGEX, '$1 ' + COMPLETE_EVENT_CONFIG + '$2');
      var opts = {
        path: path.join(db.getPath(), 'update_settings', db.settings.ddoc),
        method: 'put',
        body: { tasks: { rules: rules } }
      };
      db.request(opts, callback);
    });
  }
};