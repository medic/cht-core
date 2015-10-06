describe('ReadMessages service', function() {

  'use strict';

  var service,
      query,
      userCtx;

  beforeEach(function() {
    query = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.factory('Session', function() {
        return {
          userCtx: function() {
            return userCtx;
          }
        };
      });
    });
    inject(function($injector) {
      service = $injector.get('ReadMessages');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(query);
  });

  it('returns zero when no messages', function(done) {
    userCtx = { name: 'gareth' };
    query.returns(KarmaUtils.mockPromise(null, { rows: [] }));
    service(function(err, res) {
      chai.expect(res).to.deep.equal({
        forms: 0,
        messages: 0
      });
      done();
    });
  });

  it('returns total', function(done) {
    userCtx = { name: 'gareth' };
    query.returns(KarmaUtils.mockPromise(null, { rows: [
      {'key': ['_total', 'forms',    'christchurch'], 'value': 5 },
      {'key': ['_total', 'forms',    'dunedin'],      'value': 31},
      {'key': ['_total', 'messages', 'dunedin'],      'value': 10},
      {'key': ['gareth', 'forms',    'christchurch'], 'value': 3 },
      {'key': ['gareth', 'forms',    'dunedin'],      'value': 23},
      {'key': ['gareth', 'messages', 'dunedin'],      'value': 5 },
      {'key': ['test3',  'messages', 'dunedin'],      'value': 2 }
    ] }));
    service(function(err, res) {
      chai.expect(res).to.deep.equal({
        forms: 10,
        messages: 5
      });
      done();
    });
  });

});