describe('Verified service', function() {

  'use strict';

  var service,
      db,
      audit;

  beforeEach(function() {
    db = {};
    audit = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('db', db);
      $provide.value('audit', audit);
    });
    inject(function(_Verified_) {
      service = _Verified_;
    });
  });

  it('marks the message verified', function(done) {

    db.getDoc = function(messageId, callback) {
      chai.expect(messageId).to.equal('abc');
      callback(null, {
        _id: 'abc'
      });
    };

    audit.saveDoc = function(message, callback) {
      chai.expect(message).to.deep.equal(expected);
      callback();
    };

    var expected = { 
      _id: 'abc',
      verified: true
    };

    service('abc', true, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message verified if currently unverified', function(done) {

    db.getDoc = function(messageId, callback) {
      chai.expect(messageId).to.equal('abc');
      callback(null, {
        _id: 'abc',
        verified: false
      });
    };

    audit.saveDoc = function(message, callback) {
      chai.expect(message).to.deep.equal(expected);
      callback();
    };

    var expected = { 
      _id: 'abc',
      verified: true
    };

    service('abc', true, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message unverified', function(done) {

    db.getDoc = function(messageId, callback) {
      chai.expect(messageId).to.equal('abc');
      callback(null, {
        _id: 'abc',
        verified: true
      });
    };

    audit.saveDoc = function(message, callback) {
      chai.expect(message).to.deep.equal(expected);
      callback();
    };

    var expected = { 
      _id: 'abc',
      verified: false
    };

    service('abc', false, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('returns db errors', function(done) {

    db.getDoc = function(messageId, callback) {
      chai.expect(messageId).to.equal('abc');
      callback('errcode1');
    };

    service('abc', false, function(err) {
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

  it('returns db errors', function(done) {

    db.getDoc = function(messageId, callback) {
      chai.expect(messageId).to.equal('abc');
      callback(null, {
        _id: 'abc',
        verified: true
      });
    };

    audit.saveDoc = function(message, callback) {
      chai.expect(message).to.deep.equal(expected);
      callback('errcode2');
    };

    var expected = { 
      _id: 'abc',
      verified: false
    };

    service('abc', false, function(err) {
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });


});