describe('MessageContacts service', () => {

  'use strict';

  let service,
      query,
      allDocs,
      getContactSummaries;

  beforeEach(() => {
    query = sinon.stub();
    getContactSummaries = sinon.stub();
    allDocs = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query, allDocs: allDocs }));
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
        { name: 'alistair', from: 'a', key: 'a', read: false },
        { name: 'britney' , from: 'b', key: 'b', read: true },
      ];
      query.returns(KarmaUtils.mockPromise(null, { rows: given }));
      getContactSummaries.returns(KarmaUtils.mockPromise(null, expected));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ {}, { value: 'a' } ] }));
      return service({}).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(getContactSummaries.args[0][0]).to.deep.equal([
          { name: 'alistair', from: 'a', key: 'a' },
          { name: 'britney' , from: 'b', key: 'b' },
        ]);
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
      const given = [ { id: 'a' }, { id: 'b' } ];
      const read = [ { }, { value: 'y' } ];
      const expected = [ { id: 'a', read: false }, { id: 'b', read: true } ];
      query.returns(KarmaUtils.mockPromise(null, { rows: given }));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: read }));
      return service({ id: 'abc' }).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
      });
    });

    it('builds admin conversation with skip', () => {
      const given = [ { id: 'a' }, { id: 'b' } ];
      const read = [ { value: 'x' }, { } ];
      const expected = [ { id: 'a', read: true }, { id: 'b', read: false } ];
      query.returns(KarmaUtils.mockPromise(null, { rows: given }));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: read }));
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
