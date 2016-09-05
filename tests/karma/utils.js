window.KarmaUtils = {
  restore: function() {
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (typeof arg !== 'undefined' && arg) {
        if (arg.restore) {
          arg.restore();
        } else if (arg.reset) {
          arg.reset();
        }
      }
    }
  },
  // A service that returns a promise,
  // to mock out e.g. UserSettings().then(function(promiseResult) { ... })
  promiseService: function(err, promiseResult) {
    return function() {
      return KarmaUtils.mockPromise(err, promiseResult);
    };
  },
  // Promise that resolves synchronously.
  // Will run either then or catch.
  syncPromise: function(err, doc) {
    var returnObj = {};
    if (err) {
      returnObj.then = function() { return returnObj; };
      returnObj.catch = function(catchFunc) {
          catchFunc(err);
        };
      return returnObj;
    }
    returnObj.catch = function() { return returnObj; };
    returnObj.then = function(thenFunc) {
        thenFunc(doc);
        return returnObj;
      };
    return returnObj;
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
      return Q.defer().promise;
    };
  },
  mockDB: function(db) {
    return function() {
      return function() {
        return db;
      };
    };
  }
};

var sortedJson = function(o) {
  var s;
  if(typeof o !== 'object') {
    return JSON.stringify(o);
  }
  if(_.isArray(o)) {
    s = '[ ';
    o.forEach(function(e) {
      s += sortedJson(e) + ', ';
    });
    return s + ']';
  }
  var keys = Object.keys(o).sort();
  s = '{ ';
  for(var i=0; i<keys.length; ++i) {
    var k = keys[i];
    s += '"' + k + '":' + sortedJson(o[k]) + ', ';
  }
  // N.B. not valid JSON, as an extra comma will appear
  return s + '}';
};

var _originalDeepEqual = chai.assert.deepEqual;
chai.assert.deepEqual = function() {
  try {
    _originalDeepEqual.apply(this, arguments);
  } catch(e) {
    throw new Error(e +
        '\n\nactual:\n' + sortedJson(arguments[0]) +
        '\n\nexpected:\n' + sortedJson(arguments[1]) +
        '\n'
    );
  }
};

window._medicMobileTesting = true;
