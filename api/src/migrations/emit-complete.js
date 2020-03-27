const settingsService = require('../services/settings');
const {promisify} = require('util');
const SETTINGS_REGEX = /(.*)(\}[ \n\t]*\}[ \n\t]*)$/;
const COMPLETE_EVENT_CONFIG = 'emit(\'_complete\', { _id: true });';

module.exports = {
  name: 'emit-complete',
  created: new Date(2017, 2, 27),
  run: promisify(function(callback) {
    settingsService.get()
      .then(settings => {
        let rules = settings.tasks && settings.tasks.rules;
        if (!rules) {
          // no rules configured
          return;
        }

        if (rules.indexOf('_complete') !== -1) {
          // complete task already configured
          return;
        }

        // find the last two braces in the app settings and insert the
        // configuration to emit the _complete event
        rules = rules.replace(SETTINGS_REGEX, '$1 ' + COMPLETE_EVENT_CONFIG + '$2');
        return settingsService.update({ tasks: { rules: rules } });
      })
      .then(() => callback())
      .catch(callback);
  })
};
