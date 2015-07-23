window.KarmaUtils = {
  fakeResolved: function(err, doc) {
    return {
      then: function(callback) {
        if (!err) {
          callback(doc);
        }
        return {
          catch: function(callback) {
            if (err) {
              callback(err);
            }
          }
        };
      }
    };
  }
};
