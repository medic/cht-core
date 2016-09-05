describe('KarmaUtils', function() {
  'use strict';

  var assert = chai.assert;

  it('syncPromise success', function() {
    var promise = KarmaUtils.syncPromise(null, 'hello');
    var result = {};
    promise.then(function(val) {
      result = val;
    }).catch(function(err) {
      result = err;
    });
    assert.equal(result, 'hello');
  });

  it('syncPromise error', function() {
    var promise = KarmaUtils.syncPromise('error', 'hello');
    var result = {};
    promise.then(function(val) {
      result = val;
    }).catch(function(err) {
      result = err;
    });
    assert.equal(result, 'error');
  });

});