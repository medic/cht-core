window.KarmaUtils = {
  restore: function() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i].restore) {
        arguments[i].restore();
      }
    }
  },
  mockPromise: function(err, doc) {
    /* globals Promise */
    return new Promise(function(resolve, reject) {
      if (err) {
        reject(err);
      } else {
        resolve(doc);
      }
    });
  },
  mockDB: function(db) {
    return function() {
      return {
        get: function() {
          return db;
        }
      };
    };
  }
};
