describe('Changes service', function() {

  'use strict';

  var service,
      changesCallback,
      changesCount;

  beforeEach(function () {
    changesCallback = undefined;
    changesCount = 0;
    module('inboxApp');
    module(function ($provide) {
      $provide.value('DB', function() {
        return {
          changes: function() {
            changesCount++;
            return {
              on: function(type, callback) {
                changesCallback = callback;
                return {
                  on: function() {}
                };
              }
            };
          }
        };
      });
    });
    inject(function(_Changes_) {
      service = _Changes_;
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
        chai.expect(changesCount).to.equal(1);
        done();
      }
    });

    changesCallback(expected);
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
        chai.expect(changesCount).to.equal(1);
        done();
      }
    });

    changesCallback(expected);
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

    changesCallback(expected);

    chai.expect(results.key1.length).to.equal(1);
    chai.expect(results.key2.length).to.equal(1);
    chai.expect(results.key1[0]).to.equal(expected);
    chai.expect(results.key2[0]).to.equal(expected);
    chai.expect(changesCount).to.equal(1);

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

    changesCallback(expected);

    chai.expect(results.key1.length).to.equal(0);
    chai.expect(results.key2.length).to.equal(1);
    chai.expect(results.key2[0]).to.equal(expected);
    chai.expect(changesCount).to.equal(1);

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

    changesCallback({ id: 'x', changes: [ { rev: '2-abc' } ] });

    chai.expect(changesCount).to.equal(1);

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
        chai.expect(changesCount).to.equal(1);
        done();
      }
    });

    done();
  });
});
