describe('MessageContacts service', () => {

  'use strict';

  let service,
      query,
      getContactSummaries;

  beforeEach(() => {
    query = sinon.stub();
    getContactSummaries = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.value('GetContactSummaries', getContactSummaries);
    });
    inject($injector => service = $injector.get('MessageContacts'));
  });

  describe('list', () => {

    it('builds admin list', () => {
      const given = [
        { key: [ 'a' ], value: { name: 'alistair' } },
        { key: [ 'b' ], value: { name: 'britney' } },
      ];
      const expected = [
        { name: 'alistair', from: 'a', key: 'a' },
        { name: 'britney' , from: 'b', key: 'b' },
      ];
      query.returns(KarmaUtils.mockPromise(null, { rows: given }));
      getContactSummaries.returns(KarmaUtils.mockPromise());
      return service({}).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(getContactSummaries.args[0][0]).to.deep.equal(expected);
      });
    });

    it('returns errors from db query', done => {
      query.returns(KarmaUtils.mockPromise('server error'));
      service({})
        .then(() => {
          done(new Error('exception expected'));
        })
        .catch(err => {
          chai.expect(err).to.equal('server error');
          done();
        });
    });

  });

  describe('get', () => {

    it('builds admin conversation', () => {
      const expected = [ 'a', 'b' ];
      query.returns(KarmaUtils.mockPromise(null, { rows: expected }));
      return service({ id: 'abc'}).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
      });
    });

    it('builds admin conversation with skip', () => {
      const expected = [ 'a', 'b' ];
      query.returns(KarmaUtils.mockPromise(null, { rows: expected }));
      return service({ id: 'abc', skip: 45 }).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
      });
    });

    it('returns errors from db query', done => {
      query.returns(KarmaUtils.mockPromise('server error'));
      service({ id: 'abc' })
        .then(() => {
          done(new Error('expected exception'));
        })
        .catch(err => {
          chai.expect(err).to.equal('server error');
          done();
        });
    });

  });

});
