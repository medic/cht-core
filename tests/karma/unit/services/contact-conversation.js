describe('ContactConversation service', function() {

  'use strict';

  var service,
      query;

  beforeEach(function() {
    query = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
    });
    inject(function($injector) {
      service = $injector.get('ContactConversation');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(query);
  });

  it('builds admin conversation', function() {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    query.returns(KarmaUtils.mockPromise(null, expected));
    return service({ id: 'abc'}).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
    });
  });

  it('builds admin conversation with skip', function() {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    query.returns(KarmaUtils.mockPromise(null, expected));
    return service({ id: 'abc', skip: 45 }).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
    });
  });

  it('returns errors from db query', function(done) {
    query.returns(KarmaUtils.mockPromise('server error'));
    service({ id: 'abc' })
      .then(function() {
        done(new Error('expected exception'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('server error');
        done();
      });
  });

});