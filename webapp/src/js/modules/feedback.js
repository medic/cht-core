var levels = ['error', 'warn', 'log', 'info'],
    log = [],
    options = {};

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
  levels.forEach(function(level) {
    var original = options.console[level];
    options.console[level] = function() {
      // push the error onto the stack
      log.splice(0, 0, { level: level, arguments: JSON.stringify(arguments) });
      // remove any old log entries
      log.splice(20, Number.MAX_VALUE);
      // output to the console as per usual
      original.apply(options.console, arguments);
    };
  });
};

var registerUnhandledErrorHandler = function() {
  // listen for unhandled errors
  options.window.onerror = function(message, file, line) {
    var error = { message: message, file: file, line: line };
    try {
      module.exports.submit(error, {}, function(err) {
        if (err) {
          options.console.error('Error saving feedback', err);
        }
      });
    } catch(e) {
      // stop infinite loop of exceptions
      options.console.error('Error while trying to record error', JSON.stringify(error), e.toString(), e);
    }
  };
};

var create = function(info, appInfo, callback) {
  options.getUserCtx(function(err, userCtx) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      meta: {
        time: new Date().toISOString(),
        user: userCtx,
        url: getUrl(),
        app: appInfo.name,
        version: appInfo.version
      },
      info: info,
      log: log,
      type: 'feedback'
    });
  });
};

var submitExisting = function() {
  var existing = options.window.bootstrapFeedback || [];

  existing.forEach(function(msg) {
    create(msg, {}, function(err, doc) {
      if (!err) {
        // Intentionally not threading callbacks, we'll just fire and forget
        // these for simplicity
        options.saveDoc(doc, () => undefined);
      }
    });
  });
};

module.exports = {
  init: function(_options) {
    options = _options;
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
      registerUnhandledErrorHandler();
    }
    submitExisting();
  },
  submit: function(info, appInfo, callback) {
    create(info, appInfo, function(err, doc) {
      if (err) {
        return callback(err);
      }
      options.saveDoc(doc, callback);
    });
  }
};
