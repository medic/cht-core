describe('Cache service', function() {

  'use strict';

  var service,
      changesCallback;

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Changes', function(key, callback) {
        changesCallback = callback;
      });
    });
    inject(function($injector) {
      service = $injector.get('Cache');
    });
  });

  it('returns errors from get', function(done) {
    service(function(callback) {
      callback('boom');
    })(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns results from get', function(done) {
    var docs = [ { _id: 1 } ];
    service(function(callback) {
      callback(null, docs);
    })(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(docs);
      done();
    });
  });

  it('calls multiple callbacks', function(done) {
    var docs = [ { _id: 1 } ];
    var callback;
    var count = 0;
    var cache = service(function(_callback) {
      callback = _callback;
    });
    var ass = function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(docs);
      count++;
      if (count === 2) {
        done();
      }
    };
    cache(ass);
    cache(ass);
    callback(null, docs);
  });

  it('caches the result', function(done) {
    var docs = [ { _id: 1 } ];
    var callback;
    var count = 0;
    var cache = service(function(_callback) {
      callback = _callback;
    });
    var ass = function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(docs);
      count++;
      if (count === 3) {
        done();
      }
    };
    cache(ass);
    cache(ass);
    callback(null, docs);
    cache(ass);
  });

  it('invalidates the cache on doc update', function(done) {
    var initial = [ { _id: 1, name: 'gareth' } ];
    var updated = [ { _id: 1, name: 'alex' } ];
    var count = 0;
    var cache = service(function(callback) {
      if (count === 0) {
        callback(null, initial);
      } else if (count === 1) {
        callback(null, updated);
      } else {
        chai.expect(true).to.equal(false);
      }
      count++;
    });
    cache(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(initial);
    });
    changesCallback({ id: 1, changes: [ { rev: '5-xyz' } ] });
    cache(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(updated);
      done();
    });
  });

  it('invalidates the cache on new doc', function(done) {
    var initial = [ { _id: 1, name: 'gareth' } ];
    var updated = [ { _id: 1, name: 'gareth' }, { _id: 2, name: 'alex' } ];
    var count = 0;
    var cache = service(function(callback) {
      if (count === 0) {
        callback(null, initial);
      } else if (count === 1) {
        callback(null, updated);
      } else {
        chai.expect(true).to.equal(false);
      }
      count++;
    });
    cache(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(initial);
    });
    changesCallback({ id: 10, changes: [ { rev: '1-xyz' } ] });
    cache(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(updated);
      done();
    });
  });

});
