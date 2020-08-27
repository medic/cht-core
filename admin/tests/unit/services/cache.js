describe('Cache service', function() {

  'use strict';

  let service;
  let changesCallback;

  beforeEach(function() {
    module('adminApp');
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
    const docs = [ { _id: 1 } ];
    service({ get: function(callback) {
      callback(null, docs);
    }})(function(err, results) {
      chai.expect(err).to.equal(null);
      chai.expect(results).to.deep.equal(docs);
      done();
    });
  });

  it('calls multiple callbacks', function(done) {
    const docs = [ { _id: 1 } ];
    let callback;
    let count = 0;
    const cache = service({ get: function(_callback) {
      callback = _callback;
    }});
    const ass = function(err, results) {
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
    const docs = [ { _id: 1 } ];
    let callback;
    let count = 0;
    const cache = service({ get: function(_callback) {
      callback = _callback;
    }});
    const ass = function(err, results) {
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
    const initial = [ { _id: 1, name: 'gareth' } ];
    const updated = [ { _id: 1, name: 'alex' } ];
    let count = 0;
    const cache = service({
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
    const newDoc = { _id: 2, name: 'alex' };
    const initial = [ { _id: 1, name: 'gareth' } ];
    const updated = [ { _id: 1, name: 'gareth' }, newDoc ];
    let count = 0;
    const cache = service({
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
      invalidate: function(change) {
        return change.id === newDoc._id;
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
    const newDoc = { _id: 2, name: 'alex' };
    const initial = [ { _id: 1, name: 'gareth' } ];
    let count = 0;
    const cache = service({
      get: function(callback) {
        if (count === 0) {
          callback(null, initial);
        } else {
          chai.expect(true).to.equal(false);
        }
        count++;
      },
      invalidate: function(change) {
        return change.id !== newDoc._id;
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
