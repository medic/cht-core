describe('Changes service', function() {

  'use strict';

  var service,
      changesCalls,
      log;

  var onProvider = function(db) {
    return {
      on: function(type, callback) {
        db.callbacks[type] = callback;
        return onProvider(db);
      }
    };
  };

  beforeEach(function (done) {
    changesCalls = {
      medic: { callCount: 0, callOptions: null, callbacks: {} },
      meta:  { callCount: 0, callOptions: null, callbacks: {} }
    };

    log = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    };


    module('inboxApp');
    module(function ($provide) {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', function() {
        return function(dbOptions) {
          return {
            changes: function(changesOptions) {
              var db = changesCalls[dbOptions.meta ? 'meta' : 'medic'];
              db.callOptions = changesOptions;
              db.callCount++;
              return onProvider(db);
            },
            info: function() {
              return Promise.resolve({
                update_seq: 'test'
              });
            }
          };
        };
      });
      $provide.value('$timeout', function(fn) {
        return fn();
      });
      $provide.value('$log', log);
    });
    inject(function(_Changes_) {
      service = _Changes_;
      service().then(done);
    });
  });

  it('calls the callback', function(done) {

    var expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service({
      key: 'test',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCalls.medic.callCount).to.equal(1);
        chai.expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.medic.callbacks.change(expected);
  });

  it('calls the callback for the meta db too', function(done) {

    var expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service({
      key: 'test',
      metaDb: true,
      filter: function() {
        return true;
      },
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCalls.medic.callCount).to.equal(1);
        chai.expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.meta.callbacks.change(expected);
  });

  it('calls the most recent callback only', function(done) {

    var expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    service({
      key: 'test',
      filter: function() {
        return true;
      },
      callback: function() {
        chai.expect(false).to.equal(true);
      }
    });

    service({
      key: 'test',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCalls.medic.callCount).to.equal(1);
        chai.expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    changesCalls.medic.callbacks.change(expected);
  });

  it('calls all registered callbacks', function(done) {

    var expected = { id: 'x', changes: [ { rev: '2-abc' } ] };
    var results = { key1: [], key2: [] };

    service({
      key: 'key1',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        results.key1.push(actual);
      }
    });

    service({
      key: 'key2',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        results.key2.push(actual);
      }
    });

    changesCalls.medic.callbacks.change(expected);

    chai.expect(results.key1.length).to.equal(1);
    chai.expect(results.key2.length).to.equal(1);
    chai.expect(results.key1[0]).to.equal(expected);
    chai.expect(results.key2[0]).to.equal(expected);
    chai.expect(changesCalls.medic.callCount).to.equal(1);
    chai.expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('calls the callback if filter passes', function(done) {
    var expected = { id: 'x', changes: [ { rev: '2-abc' } ] };
    var results = { key1: [], key2: [] };

    service({
      key: 'key1',
      filter: function() {
        return false;
      },
      callback: function(actual) {
        results.key1.push(actual);
      }
    });

    service({
      key: 'key2',
      filter: function() {
        return true;
      },
      callback: function(actual) {
        results.key2.push(actual);
      }
    });

    changesCalls.medic.callbacks.change(expected);

    chai.expect(results.key1.length).to.equal(0);
    chai.expect(results.key2.length).to.equal(1);
    chai.expect(results.key2[0]).to.equal(expected);
    chai.expect(changesCalls.medic.callCount).to.equal(1);
    chai.expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('removes the listener when unsubscribe called', function(done) {
    // register callback
    var listener = service({
      key: 'yek',
      callback: function() {
        throw new Error('Callback should have been deregistered');
      }
    });

    // unsubscribe callback
    listener.unsubscribe();

    changesCalls.medic.callbacks.change({ id: 'x', changes: [ { rev: '2-abc' } ] });

    chai.expect(log.error.callCount).to.equal(0);
    chai.expect(changesCalls.medic.callCount).to.equal(1);
    chai.expect(changesCalls.meta.callCount).to.equal(1);

    done();
  });

  it('reregisters the callback next time', function(done) {
    var expected = { id: 'x', changes: [ { rev: '2-abc' } ] };

    // register callback
    var listener = service({
      key: 'yek',
      callback: function() {
        throw new Error('Callback should have been deregistered');
      }
    });

    // unsubscribe callback
    listener.unsubscribe();

    // re-subscribe callback
    service({
      key: 'yek',
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCalls.medic.callCount).to.equal(1);
        chai.expect(changesCalls.meta.callCount).to.equal(1);
        done();
      }
    });

    done();
  });

  it('re-attaches where it left off if it loses connection', function(done) {
    var first = { seq: '2-XYZ', id: 'x', changes: [ { rev: '2-abc' } ] };
    var second = { seq: '3-ZYX', id: 'y', changes: [ { rev: '1-abc' } ] };

    service({
      key: 'test',
      filter: function() {
        return true;
      },
      callback: function() {
        if (changesCalls.medic.callCount === 1) {
          chai.expect(changesCalls.medic.callOptions.since).to.equal('test');
        }
        if (changesCalls.medic.callCount === 2) {
          chai.expect(changesCalls.medic.callOptions.since).to.equal('2-XYZ');
          done();
        }
      }
    });

    changesCalls.medic.callbacks.change(first);
    changesCalls.medic.callbacks.error(new Error('Test error'));
    changesCalls.medic.callbacks.change(second);
  });
});
