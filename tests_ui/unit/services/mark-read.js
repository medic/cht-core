describe('MarkRead service', function() {

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
      $provide.value('UserCtxService', function() {
        return { name: 'james' };
      });
    });
    inject(function(_MarkRead_) {
      service = _MarkRead_;
    });
  });

  it('marks the message read', function(done) {

    db.getDoc = function(id, callback) {
      chai.expect(id).to.equal('abc');
      callback(null, { _id: 'xyz' });
    };

    db.saveDoc = function(message, callback) {
      callback(null);
    };

    var expected = { _id: 'xyz', read: [ 'james' ] };

    service('abc', true, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message unread', function(done) {

    db.getDoc = function(id, callback) {
      chai.expect(id).to.equal('abc');
      callback(null, { _id: 'xyz', read: [ 'james' ] });
    };

    db.saveDoc = function(message, callback) {
      callback(null);
    };

    var expected = { _id: 'xyz', read: [ ] };

    service('abc', false, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message read when already read', function(done) {

    db.getDoc = function(id, callback) {
      chai.expect(id).to.equal('abc');
      callback(null, { _id: 'xyz', read: [ 'james' ] });
    };

    var expected = { _id: 'xyz', read: [ 'james' ] };

    service('abc', true, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message unread when already unread', function(done) {

    db.getDoc = function(id, callback) {
      chai.expect(id).to.equal('abc');
      callback(null, { _id: 'xyz' });
    };
    
    var expected = { _id: 'xyz' };

    service('abc', false, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('returns db errors', function(done) {

    db.getDoc = function(id, callback) {
      chai.expect(id).to.equal('abc');
      callback('errcode1');
    };

    service('abc', true, function(err) {
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

    service('abc', true, function(err) {
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });

});