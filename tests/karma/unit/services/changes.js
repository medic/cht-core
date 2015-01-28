describe('Changes service', function() {

  'use strict';

  var service,
      changesCallback,
      changesCount;

  beforeEach(function () {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('db', {
        changes: function(options, callback) {
          changesCount++;
          chai.expect(options.filter).to.equal('medic/data_records');
          changesCallback = callback;
        }
      });
    });
    inject(function(_Changes_) {
      service = _Changes_;
    });
    changesCallback = undefined;
    changesCount = 0;
  });

  it('calls the callback', function(done) {

    var expected = [{ id: 'x' }];

    service(function(actual) {
      chai.expect(actual).to.equal(expected);
      chai.expect(changesCount).to.equal(1);
      done();
    });

    changesCallback(null, { results: expected });
  });

  it('calls the most recent callback with no key only', function(done) {

    var expected = [{ id: 'x' }];

    service(function() {
      chai.expect(false).to.equal(true);
    });

    service(function(actual) {
      chai.expect(actual).to.equal(expected);
      chai.expect(changesCount).to.equal(1);
      done();
    });

    changesCallback(null, { results: expected });
  });

  it('calls all registered callbacks', function(done) {

    var expected = [{ id: 'x' }];
    var results = { key1: [], key2: [] };

    service('key1', function(actual) {
      results.key1.push(actual);
    });


    service('key2', function(actual) {
      results.key2.push(actual);
    });

    changesCallback(null, { results: expected });

    chai.expect(results.key1.length).to.equal(1);
    chai.expect(results.key2.length).to.equal(1);
    chai.expect(results.key1[0]).to.equal(expected);
    chai.expect(results.key2[0]).to.equal(expected);
    chai.expect(changesCount).to.equal(1);

    done();
  });

  it('errors are ignored', function(done) {

    service(function() {
      chai.expect(false).to.equal(true);
    });

    changesCallback('bugger');
    changesCallback(null, {});

    done();
  });

  it('no results is ignored', function(done) {

    service(function() {
      chai.expect(false).to.equal(true);
    });

    changesCallback(null, {});

    done();
  });
});