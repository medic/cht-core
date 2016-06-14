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
