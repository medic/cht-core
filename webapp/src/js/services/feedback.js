var uuidV4 = require('uuid/v4');

/*
  Feedback service
 */
angular.module('inboxServices').factory('Feedback',
  function(
    APP_CONFIG,
    DB,
    Session
  ) {

    'ngInject';
    'use strict';

    let options = {};

    const LEVELS = ['error', 'warn', 'log', 'info'],
          LOG_LENGTH = 20,
          logs = new Array(LOG_LENGTH);
    let logIdx = 0;

    // Flips and reverses log into a clean latest first array for logging out
    const getLog = () =>
      // [oldest + newest] -> reversed -> filter empty
      (logs.slice(logIdx, LOG_LENGTH).concat(logs.slice(0, logIdx))).reverse().filter(i => !!i);

    var getUrl = function() {
      var url = options.document && options.document.URL;
      if (url) {
        // blank out passwords
        return url.replace(/:[^@:]*@/, ':********@');
      }
      return null;
    };

    var registerConsoleInterceptor = function() {
      // intercept console logging
      LEVELS.forEach(function(level) {
        var original = options.console[level];
        options.console[level] = function() {
          // push the error onto the stack
          logs[logIdx++] = { level: level, arguments: JSON.stringify(arguments) };
          if (logIdx === LOG_LENGTH) {
            logIdx = 0;
          }

          // output to the console as per usual
          original.apply(options.console, arguments);
        };
      });
    };

    var create = function(info, isManual, callback) {
      var userCtx = Session.userCtx();
      const date = new Date().toISOString();
      const uuid = uuidV4();
      callback(null, {
        _id: `feedback-${date}-${uuid}`,
        meta: {
          time: date,
          user: userCtx,
          url: getUrl(),
          app: APP_CONFIG.name,
          version: APP_CONFIG.version,
          source: isManual ? 'manual' : 'automatic'
        },
        info: info,
        log: getLog(),
        type: 'feedback'
      });
    };

    var submitExisting = function() {
      var existing = options.window.bootstrapFeedback || [];

      existing.forEach(function(msg) {
        create(msg, {}, function(err, doc) {
          if (!err) {
            // Intentionally not threading callbacks, we'll just fire and forget
            // these for simplicity
            DB().post(doc);
          }
        });
      });
    };

    return {
      init: function(_options) {
        options = _options || {};
        if (!options.window && typeof window !== 'undefined') {
          options.window = window;
        }
        if (!options.console && typeof console !== 'undefined') {
          options.console = console;
        }
        if (!options.document && typeof document !== 'undefined') {
          options.document = document;
        }
        if (!options.window._medicMobileTesting) {
          registerConsoleInterceptor();
        }
        submitExisting();
      },
      submit: function(info, isManual, callback) {
        create(info, isManual, function(err, doc) {
          if (err) {
            return callback(err);
          }

          DB({meta: true}).post(doc, callback);
        });
      }
    };
  }
);
