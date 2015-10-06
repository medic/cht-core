describe('MarkAllRead service', function() {

  'use strict';

  var service,
      bulkDocs;

  beforeEach(function() {
    bulkDocs = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ bulkDocs: bulkDocs }));
      $provide.factory('Session', function() {
        return {
          userCtx: function() {
            return { name: 'james' };
          }
        };
      });
    });
    inject(function(_MarkAllRead_) {
      service = _MarkAllRead_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(bulkDocs);
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

    bulkDocs.returns(KarmaUtils.mockPromise());

    service(docs, true).then(function() {
      chai.expect(bulkDocs.args[0][0]).to.deep.equal(expected);
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

    bulkDocs.returns(KarmaUtils.mockPromise());

    service(docs, false).then(function() {
      chai.expect(bulkDocs.args[0][0]).to.deep.equal(expected);
      done();
    });
  });

  it('returns save errors', function(done) {

    bulkDocs.returns(KarmaUtils.mockPromise('errcode1'));

    var docs = [
      { _id: 'a', read: [ 'james' ] },
      { _id: 'b' },
      { _id: 'c', read: [ 'james', 'jack' ] },
    ];

    service(docs, true).catch(function(err) {
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

});