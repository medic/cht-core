var db = require('db'),
    session = require('session'),
    levels = ['error', 'warn', 'log', 'info'];

var log = [];

var getUrl = function() {
  var url = document && document.URL;
  if (url) {
    // blank out passwords
    return url.replace(/:[^@:]*@/, ':********@');
  }
  return null;
};

var registerConsoleInterceptor = function() {
  // intercept console logging
  levels.forEach(function(level) {
    var original = console[level];
    console[level] = function() {
      // push the error onto the stack
      log.splice(0, 0, { level: level, arguments: arguments });
      // remove any old log entries
      log.splice(20, Number.MAX_VALUE);
      // output to the console as per usual
      original.apply(console, arguments);
    };
  });
};

var registerUnhandledErrorHandler = function() {
  // listen for unhandled errors
  window.onerror = function(message, file, line) {
    try {
      module.exports.submit({ message: message, file: file, line: line }, function(err) {
        if (err) {
          console.error('Error saving feedback', err);
        }
      });
    } catch(e) {
      // stop infinite loop of exceptions
      console.error('Error while trying to record error', e);
    }
  };
};

var create = function(info, appInfo, callback) {
  session.info(function(err, session) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      meta: {
        time: new Date().toISOString(),
        user: session && session.userCtx,
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

module.exports = {

  submit: function(info, appInfo, callback) {
    create(info, appInfo, function(err, doc) {
      if (err) {
        return callback(err);
      }
      db.current().saveDoc(doc, callback);
    });
  },

  // Exposed for testing
  withDb: function(_db) {
    db = _db;
  }

};

if (typeof window !== 'undefined') {
  registerConsoleInterceptor();
  registerUnhandledErrorHandler();
}