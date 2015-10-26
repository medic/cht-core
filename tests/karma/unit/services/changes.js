describe('Changes service', function() {

  'use strict';

  var service,
      getDoc,
      changesCallback,
      changesCount;

  beforeEach(function () {
    changesCallback = undefined;
    getDoc = undefined;
    changesCount = 0;
    module('inboxApp');
    module(function ($provide) {
      $provide.value('DB', {
        get: function() {
          return {
            get: function() {
              return {
                then: function(callback) {
                  callback(getDoc);
                }
              };
            },
            changes: function() {
              changesCount++;
              return {
                on: function(type, callback) {
                  changesCallback = callback;
                  return {
                    on: function() {}
                  }
                }
              };
            }
          };
        }
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
      callback: function() {
        chai.expect(false).to.equal(true);
      }
    });

    service({
      key: 'test',
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
      callback: function(actual) {
        results.key1.push(actual);
      }
    });

    service({
      key: 'key2',
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

  it('gets the doc if new', function(done) {
    var expected = { id: 'x', changes: [ { rev: '1-abc' } ] };
    getDoc = { id: 'x', rev: '1-abc', name: 'gareth' };

    service({
      key: 'test',
      filter: function(change) {
        return change.newDoc.name === 'gareth';
      },
      callback: function(actual) {
        chai.expect(actual).to.equal(expected);
        chai.expect(changesCount).to.equal(1);
        done();
      }
    });

    changesCallback(expected);

  });

});