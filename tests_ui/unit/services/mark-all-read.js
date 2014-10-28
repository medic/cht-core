describe('MarkAllRead service', function() {

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
    inject(function(_MarkAllRead_) {
      service = _MarkAllRead_;
    });
  });

  it('marks the messages read', function(done) {

    var docs = [
      { _id: 'a' },
      { _id: 'b', read: [ 'james' ] },
      { _id: 'c', read: [ 'jack' ] }
    ];
    var expected = [
      { _id: 'a', read: [ 'james' ] },
      { _id: 'c', read: [ 'jack', 'james' ] }
    ];

    db.bulkSave = function(messages, callback) {
      chai.expect(messages).to.deep.equal(expected);
      callback(null);
    };

    service(docs, true, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('marks the messages unread', function(done) {

    var docs = [
      { _id: 'a', read: [ 'james' ] },
      { _id: 'b' },
      { _id: 'c', read: [ 'james', 'jack' ] },
    ];
    var expected = [
      { _id: 'a', read: [ ] },
      { _id: 'c', read: [ 'jack' ] }
    ];

    db.bulkSave = function(messages, callback) {
      chai.expect(messages).to.deep.equal(expected);
      callback(null);
    };

    service(docs, false, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('returns audit errors', function(done) {

    db.bulkSave = function(messages, callback) {
      callback('errcode1');
    };

    var docs = [
      { _id: 'a', read: [ 'james' ] },
      { _id: 'b' },
      { _id: 'c', read: [ 'james', 'jack' ] },
    ];

    service(docs, true, function(err) {
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

});