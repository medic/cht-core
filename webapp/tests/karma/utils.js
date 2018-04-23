// Override chai.assert.equal to pretty print.
var equal = chai.assert.equal;
chai.assert.equal = function() {
  try {
    equal.apply(this, arguments);
  } catch(e) {
    throw new Error(e +
        '\nA: ' + JSON.stringify(arguments[0], null, 2) +
        '\nB: ' + JSON.stringify(arguments[1], null, 2));
  }
};

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
    return () => KarmaUtils.promise(err, promiseResult);
  },
  promise: (err, payload) => err ? Promise.reject(err) : Promise.resolve(payload),
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
