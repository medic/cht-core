describe('MessageContact service', function() {

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
      service = $injector.get('MessageContact');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(query);
  });

  it('builds admin list', function() {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    query.returns(KarmaUtils.mockPromise(null, expected));
    return service({}).then(function(actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
    });
  });

  it('returns errors from db query', function(done) {
    query.returns(KarmaUtils.mockPromise('server error'));
    service({})
      .then(function() {
        done(new Error('exception expected'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('server error');
        done();
      });
  });

});