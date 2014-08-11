describe('DeleteMessage service', function() {

  'use strict';

  var service,
      db,
      audit,
      message;

  beforeEach(function() {
    db = {};
    audit = {};
    message = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('db', db);
      $provide.value('audit', audit);
    });
    inject(function(_DeleteMessage_) {
      service = _DeleteMessage_;
    });
  });

  it('marks the message deleted', function(done) {

    db.getDoc = function(id, callback) {
      chai.expect(id).to.equal('abc');
      callback(null, { _id: 'xyz' });
    };

    audit.saveDoc = function(message, callback) {
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

    audit.saveDoc = function(message, callback) {
      callback('errcode2');
    };

    service('abc', function(err) {
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });

});