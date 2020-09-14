describe('GetDataRecords service', () => {

  'use strict';

  let service;
  let allDocs;
  let GetSummaries;
  let HydrateContactNames;

  beforeEach(() => {
    allDocs = sinon.stub();
    GetSummaries = sinon.stub();
    HydrateContactNames = sinon.stub();
    module('adminApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ allDocs: allDocs }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('HydrateContactNames', HydrateContactNames);
      $provide.value('GetSummaries', GetSummaries);
    });
    inject($injector => service = $injector.get('GetDataRecords'));
  });

  afterEach(() => {
    KarmaUtils.restore(allDocs, GetSummaries, HydrateContactNames);
  });

  it('returns empty array when given no ids', () => {
    return service().then(actual => chai.expect(actual).to.deep.equal([]));
  });

  it('returns empty array when given empty array', () => {
    return service([]).then(actual => chai.expect(actual).to.deep.equal([]));
  });

  describe('summaries', () => {

    it('db errors', () => {
      GetSummaries.returns(Promise.reject('missing'));
      return service('5')
        .then(() => {
          throw new Error('expected error to be thrown');
        })
        .catch(err => chai.expect(err).to.equal('missing'));
    });

    it('no result', () => {
      GetSummaries.returns(Promise.resolve(null));
      HydrateContactNames.returns(Promise.resolve([ ]));
      return service('5').then(actual => {
        chai.expect(actual).to.equal(null);
        chai.expect(GetSummaries.callCount).to.equal(1);
        chai.expect(GetSummaries.args[0][0]).to.deep.equal(['5']);
        chai.expect(allDocs.callCount).to.equal(0);
      });
    });

    it('single hydrated result', () => {
      const expected = {
        _id: '5',
        name: 'five',
        contact: 'jim',
        lineage: [ 'area', 'center' ]
      };
      GetSummaries.returns(Promise.resolve([
        {
          _id: '5',
          name: 'five',
          contact: 'a',
          lineage: [ 'b', 'c' ]
        }
      ]));
      HydrateContactNames.returns(Promise.resolve([ expected ]));
      return service('5', { hydrateContactNames: true }).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(GetSummaries.callCount).to.equal(1);
        chai.expect(allDocs.callCount).to.equal(0);
        chai.expect(HydrateContactNames.callCount).to.equal(1);
        chai.expect(HydrateContactNames.args[0][0]).to.deep.equal([{
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
      GetSummaries.returns(Promise.resolve([
        { _id: '5', name: 'five' },
        { _id: '6', name: 'six' },
        { _id: '7', name: 'seven' }
      ]));
      HydrateContactNames.returns(Promise.resolve(expected));
      return service([ '5', '6', '7' ], { hydrateContactNames: true }).then(actual => {
        chai.expect(actual).to.deep.equal(expected);
        chai.expect(GetSummaries.callCount).to.equal(1);
        chai.expect(GetSummaries.args[0][0]).to.deep.equal([ '5', '6', '7' ]);
        chai.expect(allDocs.callCount).to.equal(0);
      });
    });

  });

  describe('details', () => {

    it('db errors', () => {
      allDocs.returns(Promise.reject('missing'));
      return service('5', { include_docs: true })
        .then(() => {
          throw new Error('expected error to be thrown');
        })
        .catch(err => chai.expect(err).to.equal('missing'));
    });

    it('no result', () => {
      allDocs.returns(Promise.resolve({ rows: [] }));
      return service('5', { include_docs: true }).then(actual => {
        chai.expect(actual).to.equal(null);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
        chai.expect(GetSummaries.callCount).to.equal(0);
      });
    });

    it('single result', () => {
      allDocs.returns(Promise.resolve({ rows: [
        { doc: { _id: '5', name: 'five' } }
      ] }));
      return service('5', { include_docs: true }).then(actual => {
        chai.expect(actual).to.deep.equal({ _id: '5', name: 'five' });
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
        chai.expect(GetSummaries.callCount).to.equal(0);
      });
    });

    it('multiple results', () => {
      allDocs.returns(Promise.resolve({ rows: [
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
        chai.expect(GetSummaries.callCount).to.equal(0);
      });
    });

  });
});
