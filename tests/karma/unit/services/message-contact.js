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

  it('builds admin list', function(done) {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    query.returns(KarmaUtils.mockPromise(null, expected));
    service({}, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });
  });

  it('returns errors from db query', function(done) {
    query.returns(KarmaUtils.mockPromise('server error'));
    service({}, function(err) {
      chai.expect(err).to.equal('server error');
      done();
    });
  });

});