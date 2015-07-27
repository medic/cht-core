window.KarmaUtils = {
  restore: function() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i].restore) {
        arguments[i].restore();
      }
    }
  },
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
