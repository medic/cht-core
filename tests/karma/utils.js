window.KarmaUtils = {
  restore: function() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i].restore) {
        arguments[i].restore();
      } else if (arguments[i].reset) {
        arguments[i].reset();
      }
    }
  },
  mockPromise: function(err, doc) {
    var result = new Promise(function(resolve, reject) {
      if (err) {
        reject(err);
      } else {
        resolve(doc);
      }
    });
    result.on = function() {
      return result;
    };
    return result;
  },
  mockDB: function(db, getRemoteUrl) {
    return function() {
      return {
        get: function() {
          return db;
        },
        getRemoteUrl: getRemoteUrl
      };
    };
  }
};
