describe('Cache service', function() {

  'use strict';

  var service,
      changesCallback;

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Changes', function(options) {
        changesCallback = options.callback;
      });
    });
    inject(function($injector) {
      service = $injector.get('Cache');
    });
  });

  it('returns errors from get', function(done) {
    service({ get: function(callback) {
      callback('boom');
    }})(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns results from get', function(done) {
    var docs = [ { _id: 1 } ];
    service({ get: function(callback) {
      callback(null, docs);
    }})(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(docs);
      done();
    });
  });

  it('calls multiple callbacks', function(done) {
    var docs = [ { _id: 1 } ];
    var callback;
    var count = 0;
    var cache = service({ get: function(_callback) {
      callback = _callback;
    }});
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
    var cache = service({ get: function(_callback) {
      callback = _callback;
    }});
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
    var cache = service({
      get: function(callback) {
        if (count === 0) {
          callback(null, initial);
        } else if (count === 1) {
          callback(null, updated);
        } else {
          chai.expect(true).to.equal(false);
        }
        count++;
      },
      invalidate: function() {
        return true;
      }
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
    var newDoc = { _id: 2, name: 'alex' };
    var initial = [ { _id: 1, name: 'gareth' } ];
    var updated = [ { _id: 1, name: 'gareth' }, newDoc ];
    var count = 0;
    var cache = service({
      get: function(callback) {
        if (count === 0) {
          callback(null, initial);
        } else if (count === 1) {
          callback(null, updated);
        } else {
          chai.expect(true).to.equal(false);
        }
        count++;
      },
      invalidate: function(doc) {
        return doc._id === newDoc._id;
      }
    });
    cache(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(initial);
    });
    changesCallback({ id: newDoc._id, doc: newDoc });
    setTimeout(function() {
      cache(function(err, results) {
        chai.expect(err).to.equal(null);
        chai.expect(results).to.deep.equal(updated);
        done();
      });
    });
  });

  it('does not invalidate the cache when filter fails', function(done) {
    var newDoc = { _id: 2, name: 'alex' };
    var initial = [ { _id: 1, name: 'gareth' } ];
    var count = 0;
    var cache = service({
      get: function(callback) {
        if (count === 0) {
          callback(null, initial);
        } else {
          chai.expect(true).to.equal(false);
        }
        count++;
      },
      invalidate: function(doc) {
        return doc._id !== newDoc._id;
      }
    });
    cache(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(initial);
    });
    changesCallback({
      id: newDoc._id,
      changes: [ { rev: '1-xyz' } ],
      doc: newDoc
    });
    setTimeout(function() {
      cache(function(err, results) {
        chai.expect(err).to.equal(null);
        chai.expect(results).to.deep.equal(initial);
        done();
      });
    });
  });

});
