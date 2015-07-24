window.KarmaUtils = {
  fakeResolved: function(err, doc) {
    return {
      then: function(callback) {
        if (!err) {
          return KarmaUtils.fakeResolved(null, callback(doc));
        }
        return this;
      },
      catch: function(callback) {
        if (err) {
          callback(err);
        }
        return this;
      }
    };
  }
};
