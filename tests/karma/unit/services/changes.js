describe('Changes service', function() {

  'use strict';

  var service,
      changesCallback,
      changesCount,
      filter;

  beforeEach(function () {
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
    changesCallback = undefined;
    changesCount = 0;
    filter = 'medic/data_records';
  });

  it('calls the callback', function(done) {

    var expected = { id: 'x' };

    service(function(actual) {
      chai.expect(actual).to.equal(expected);
      chai.expect(changesCount).to.equal(1);
      done();
    });

    changesCallback(expected);
  });

  it('calls the most recent callback with no key only', function(done) {

    var expected = { id: 'x' };

    service(function() {
      chai.expect(false).to.equal(true);
    });

    service(function(actual) {
      chai.expect(actual).to.equal(expected);
      chai.expect(changesCount).to.equal(1);
      done();
    });

    changesCallback(expected);
  });

  it('calls all registered callbacks', function(done) {

    var expected = { id: 'x' };
    var results = { key1: [], key2: [] };

    service({ key: 'key1' }, function(actual) {
      results.key1.push(actual);
    });


    service({ key: 'key2' }, function(actual) {
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

    service(function() {
      chai.expect(false).to.equal(true);
    });

    changesCallback();

    done();
  });

  it('passes through the filter', function(done) {

    var expected = { id: 'x' };
    filter = 'medic/ddoc';

    service({ filter: filter }, function(actual) {
      chai.expect(actual).to.equal(expected);
      chai.expect(changesCount).to.equal(1);
      done();
    });

    changesCallback(expected);
  });
});