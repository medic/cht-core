describe('GetDataRecords service', () => {

  'use strict';

  let service,
      allDocs,
      query,
      GetContactSummaries;

  beforeEach(() => {
    allDocs = sinon.stub();
    query = sinon.stub();
    GetContactSummaries = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ allDocs: allDocs, query: query }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('GetContactSummaries', GetContactSummaries);
    });
    inject($injector => service = $injector.get('GetDataRecords'));
  });

  afterEach(() => {
    KarmaUtils.restore(allDocs, query, GetContactSummaries);
  });

  it('returns empty array when given no ids', () => {
    return service().then(actual => chai.expect(actual).to.deep.equal([]));
  });

  it('returns empty array when given empty array', () => {
    return service([]).then(actual => chai.expect(actual).to.deep.equal([]));
  });

  describe('summaries', () => {

    it('db errors', () => {
      query.returns(KarmaUtils.mockPromise('missing'));
      return service('5')
        .then(() => {
          throw new Error('expected error to be thrown');
        })
        .catch(err => chai.expect(err).to.equal('missing'));
    });

    it('no result', () => {
      query.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      GetContactSummaries.returns(KarmaUtils.mockPromise(null, [ ]));
      return service('5').then(actual => {
        chai.expect(actual).to.equal(null);
        chai.expect(query.callCount).to.equal(1);
        chai.expect(query.args[0][0]).to.equal('medic-client/doc_summaries_by_id');
        chai.expect(query.args[0][1]).to.deep.equal({ keys: [ '5' ] });
        chai.expect(allDocs.callCount).to.equal(0);
      });
    });

    it('single result', () => {
      const expected = {
        _id: '5',
        name: 'five',
        contact: 'jim',
        lineage: [ 'area', 'center' ]
      };
      query.returns(KarmaUtils.mockPromise(null, { rows: [
        {
          id: '5',
          value: {
            name: 'five',
            contact: 'a',
            lineage: [ 'b', 'c' ]
          }
        }
      ] }));
      GetContactSummaries.returns(KarmaUtils.mockPromise(null, [ expected ]));
      return service('5').then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(query.callCount).to.equal(1);
        chai.expect(query.args[0][0]).to.equal('medic-client/doc_summaries_by_id');
        chai.expect(query.args[0][1]).to.deep.equal({ keys: [ '5' ] });
        chai.expect(allDocs.callCount).to.equal(0);
        chai.expect(GetContactSummaries.callCount).to.equal(1);
        chai.expect(GetContactSummaries.args[0][0]).to.deep.equal([{
          _id: '5',
          name: 'five',
          contact: 'a',
          lineage: [ 'b', 'c' ]
        }]);
      });
    });

    it('multiple results', () => {
      const expected = [
        { _id: '5', name: 'five' },
        { _id: '6', name: 'six' },
        { _id: '7', name: 'seven' }
      ];
      query.returns(KarmaUtils.mockPromise(null, { rows: [
        { id: '5', value: { name: 'five' } },
        { id: '6', value: { name: 'six' } },
        { id: '7', value: { name: 'seven' } }
      ] }));
      GetContactSummaries.returns(KarmaUtils.mockPromise(null, expected));
      return service([ '5', '6', '7' ]).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(query.callCount).to.equal(1);
        chai.expect(query.args[0][0]).to.equal('medic-client/doc_summaries_by_id');
        chai.expect(query.args[0][1]).to.deep.equal({ keys: [ '5', '6', '7' ] });
        chai.expect(allDocs.callCount).to.equal(0);
      });
    });

  });

  describe('details', () => {

    it('db errors', () => {
      allDocs.returns(KarmaUtils.mockPromise('missing'));
      return service('5', { include_docs: true })
        .then(() => {
          throw new Error('expected error to be thrown');
        })
        .catch(err => chai.expect(err).to.equal('missing'));
    });

    it('no result', () => {
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      return service('5', { include_docs: true }).then(actual => {
        chai.expect(actual).to.equal(null);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
        chai.expect(query.callCount).to.equal(0);
      });
    });

    it('single result', () => {
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [
        { doc: { _id: '5', name: 'five' } }
      ] }));
      return service('5', { include_docs: true }).then(actual => {
        chai.expect(actual).to.deep.equal({ _id: '5', name: 'five' });
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
        chai.expect(query.callCount).to.equal(0);
      });
    });

    it('multiple results', () => {
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [
        { doc: { _id: '5', name: 'five' } },
        { doc: { _id: '6', name: 'six' } },
        { doc: { _id: '7', name: 'seven' } }
      ] }));
      return service([ '5', '6', '7' ], { include_docs: true }).then(actual => {
        chai.expect(actual).to.deep.equal([
          { _id: '5', name: 'five' },
          { _id: '6', name: 'six' },
          { _id: '7', name: 'seven' }
        ]);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5', '6', '7' ], include_docs: true });
        chai.expect(query.callCount).to.equal(0);
      });
    });

  });
});
