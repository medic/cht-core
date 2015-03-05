describe('DeleteDoc service', function() {

  'use strict';

  var service,
      db,
      message;

  beforeEach(function() {
    db = {};
    message = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('db', db);
    });
    inject(function(_DeleteDoc_) {
      service = _DeleteDoc_;
    });
  });

  it('marks the message deleted', function(done) {

    db.getDoc = function(id, callback) {
      chai.expect(id).to.equal('abc');
      callback(null, { _id: 'xyz' });
    };

    db.saveDoc = function(message, callback) {
      callback(null);
    };

    var expected = { _id: 'xyz', _deleted: true };

    service('abc', function(err, actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('returns db errors', function(done) {

    db.getDoc = function(id, callback) {
      chai.expect(id).to.equal('abc');
      callback('errcode1');
    };

    service('abc', function(err) {
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

  it('returns audit errors', function(done) {

    db.getDoc = function(id, callback) {
      callback(null, { _id: 'xyz' });
    };

    db.saveDoc = function(message, callback) {
      callback('errcode2');
    };

    service('abc', function(err) {
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });

});