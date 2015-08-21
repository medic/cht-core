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
      $provide.value('DB', {
        get: function() {
          return {
            changes: function() {
              changesCount++;
              return {
                on: function(type, callback) {
                  changesCallback = callback;
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

    var expected = { id: 'x' };

    service('test', function(actual) {
      chai.expect(actual).to.equal(expected);
      chai.expect(changesCount).to.equal(1);
      done();
    });

    changesCallback(expected);
  });

  it('calls the most recent callback only', function(done) {

    var expected = { id: 'x' };

    service('test', function() {
      chai.expect(false).to.equal(true);
    });

    service('test', function(actual) {
      chai.expect(actual).to.equal(expected);
      chai.expect(changesCount).to.equal(1);
      done();
    });

    changesCallback(expected);
  });

  it('calls all registered callbacks', function(done) {

    var expected = { id: 'x' };
    var results = { key1: [], key2: [] };

    service('key1', function(actual) {
      results.key1.push(actual);
    });

    service('key2', function(actual) {
      results.key2.push(actual);
    });

    changesCallback(expected);

    chai.expect(results.key1.length).to.equal(1);
    chai.expect(results.key2.length).to.equal(1);
    chai.expect(results.key1[0]).to.equal(expected);
    chai.expect(results.key2[0]).to.equal(expected);
    chai.expect(changesCount).to.equal(1);

    done();
  });

  it('no results is ignored', function(done) {

    service('test', function() {
      chai.expect(false).to.equal(true);
    });

    changesCallback();

    done();
  });

});