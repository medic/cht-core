describe('ReadMessages service', () => {

  'use strict';

  let service,
      query,
      userCtx;

  beforeEach(() => {
    query = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.factory('Session', () => {
        return {
          userCtx: () => {
            return userCtx;
          }
        };
      });
    });
    inject($injector => {
      service = $injector.get('ReadMessages');
    });
  });

  afterEach(() => {
    KarmaUtils.restore(query);
  });

  it('returns zero when no messages', () => {
    userCtx = { name: 'gareth' };
    query.returns(KarmaUtils.mockPromise(null, { rows: [] }));
    return service().then(actual => {
      chai.expect(actual).to.deep.equal({
        forms: 0,
        messages: 0
      });
    });
  });

  it('returns total', () => {
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
    return service().then(actual => {
      chai.expect(actual).to.deep.equal({
        forms: 10,
        messages: 5
      });
    });
  });

});
