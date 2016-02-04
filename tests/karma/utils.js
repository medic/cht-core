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
  // a promise than never resolves or rejects
  nullPromise: function() {
    return function() {
      return {
        then: function() {
          return {
            catch: function() {}
          };
        }
      };
    };
  },
  // With a mix of $q and JS native promises, sometimes $rootscope.apply() doesn't resolve all layers of promises.
  // Use $q promises to avoid it.
  mockQPromise: function($q, err, doc) {
    var result = $q(function(resolve, reject) {
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
  // For spying on promise.on()
  mockQPromiseWithOnStub: function($q, err, doc) {
    var result = KarmaUtils.mockQPromise($q, null, {});
    var onStub = sinon.stub();
    result.on = onStub;
    onStub.returns(result);
    return result;
  },
  mockDB: function(db, getRemoteUrl, dbRemote) {
    return function() {
      return {
        get: function() {
          return db;
        },
        getRemote: function() {
          return dbRemote;
        },
        getRemoteUrl: getRemoteUrl
      };
    };
  },
  inlineTimeout: function(work) {
    work();
    return {'then': function(then) {
      then();
    }};
  }
};
