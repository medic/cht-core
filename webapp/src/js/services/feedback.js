const uuidV4 = require('uuid/v4');

/*
  Feedback service
 */
angular.module('inboxServices').factory('Feedback',
  function(
    DB,
    Session,
    Version
  ) {

    'ngInject';
    'use strict';

    let options = {};
    let logIdx = 0;

    const LEVELS = ['error', 'warn', 'log', 'info'];
    const LOG_LENGTH = 20;
    const logs = new Array(LOG_LENGTH);

    // Flips and reverses log into a clean latest first array for logging out
    const getLog = () => {
      // [oldest + newest] -> reversed -> filter empty
      return (logs.slice(logIdx, LOG_LENGTH).concat(logs.slice(0, logIdx)))
        .reverse()
        .filter(i => !!i);
    };

    const getUrl = () => {
      const url = options.document && options.document.URL;
      if (url) {
        // blank out passwords
        return url.replace(/:[^@:]*@/, ':********@');
      }
    };

    const registerConsoleInterceptor = () => {
      // intercept console logging
      LEVELS.forEach(level => {
        const original = options.console[level];
        options.console[level] = function() {
          // push the error onto the stack
          logs[logIdx++] = { level, arguments: JSON.stringify(arguments) };
          if (logIdx === LOG_LENGTH) {
            logIdx = 0;
          }

          // output to the console as per usual
          original.apply(options.console, arguments);
        };
      });
    };

    const create = (info, isManual) => {
      return Version.getLocal().then(({ version }) => {
        const date = new Date().toISOString();
        const uuid = uuidV4();
        return {
          _id: `feedback-${date}-${uuid}`,
          meta: {
            time: date,
            user: Session.userCtx(),
            url: getUrl(),
            version: version,
            source: isManual ? 'manual' : 'automatic'
          },
          info: info,
          log: getLog(),
          type: 'feedback'
        };
      });
    };

    const createAndSave = (info, isManual) => {
      return create(info, isManual)
        .then(doc => DB({ meta: true }).post(doc));
    };

    const submitExisting = () => {
      const existing = options.window.bootstrapFeedback || [];
      existing.forEach(msg => {
        createAndSave(msg).catch(() => {
          // Intentionally not throwing errors, we'll just fire and forget
          // these for simplicity
        });
      });
    };

    return {
      init: () => {
        options = {
          window: window,
          console: console,
          document: document
        };
        registerConsoleInterceptor();
        submitExisting();
      },

      submit: (info, isManual) => createAndSave(info, isManual),

      // used for testing
      _setOptions: _options => {
        options = _options;
        registerConsoleInterceptor();
      }
    };
  }
);
