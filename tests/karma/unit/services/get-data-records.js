describe('GetDataRecords service', function() {

  'use strict';

  var service,
      allDocs,
      query;

  beforeEach(function() {
    allDocs = sinon.stub();
    query = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ allDocs: allDocs, query: query }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function($injector) {
      service = $injector.get('GetDataRecords');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(allDocs, query);
  });

  it('returns empty array when given no ids', function() {
    return service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([]);
      });
  });

  it('returns empty array when given empty array', function() {
    return service([])
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([]);
      });
  });

  describe('summaries', function() {

    it('db errors', function() {
      query.returns(KarmaUtils.mockPromise('missing'));
      return service('5')
        .then(function() {
          throw new Error('expected error to be thrown');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('missing');
        });
    });

    it('no result', function() {
      query.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      return service('5')
        .then(function(actual) {
          chai.expect(actual).to.equal(null);
          chai.expect(query.callCount).to.equal(1);
          chai.expect(query.args[0][0]).to.equal('medic-client/doc_summaries_by_id');
          chai.expect(query.args[0][1]).to.deep.equal({ keys: [[ '5' ]] });
          chai.expect(allDocs.callCount).to.equal(0);
        });
    });

    it('single result', function() {
      query.returns(KarmaUtils.mockPromise(null, { rows: [
        { id: '5', value: { name: 'five' } }
      ] }));
      return service('5')
        .then(function(actual) {
          chai.expect(actual).to.deep.equal({ _id: '5', name: 'five' });
          chai.expect(query.callCount).to.equal(1);
          chai.expect(query.args[0][0]).to.equal('medic-client/doc_summaries_by_id');
          chai.expect(query.args[0][1]).to.deep.equal({ keys: [[ '5' ]] });
          chai.expect(allDocs.callCount).to.equal(0);
        });
    });

    it('multiple results', function() {
      query.returns(KarmaUtils.mockPromise(null, { rows: [
        { id: '5', value: { name: 'five' } },
        { id: '6', value: { name: 'six' } },
        { id: '7', value: { name: 'seven' } }
      ] }));
      return service([ '5', '6', '7' ])
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([
            { _id: '5', name: 'five' },
            { _id: '6', name: 'six' },
            { _id: '7', name: 'seven' }
          ]);
          chai.expect(query.callCount).to.equal(1);
          chai.expect(query.args[0][0]).to.equal('medic-client/doc_summaries_by_id');
          chai.expect(query.args[0][1]).to.deep.equal({ keys: [[ '5' ], [ '6' ], [ '7' ]] });
          chai.expect(allDocs.callCount).to.equal(0);
        });
    });

  });

  describe('details', function() {

    it('db errors', function() {
      allDocs.returns(KarmaUtils.mockPromise('missing'));
      return service('5', { include_docs: true })
        .then(function() {
          throw new Error('expected error to be thrown');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('missing');
        });
    });

    it('no result', function() {
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      return service('5', { include_docs: true })
        .then(function(actual) {
          chai.expect(actual).to.equal(null);
          chai.expect(allDocs.callCount).to.equal(1);
          chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
          chai.expect(query.callCount).to.equal(0);
        });
    });

    it('single result', function() {
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [
        { doc: { _id: '5', name: 'five' } }
      ] }));
      return service('5', { include_docs: true })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal({ _id: '5', name: 'five' });
          chai.expect(allDocs.callCount).to.equal(1);
          chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ '5' ], include_docs: true });
          chai.expect(query.callCount).to.equal(0);
        });
    });

    it('multiple results', function() {
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [
        { doc: { _id: '5', name: 'five' } },
        { doc: { _id: '6', name: 'six' } },
        { doc: { _id: '7', name: 'seven' } }
      ] }));
      return service([ '5', '6', '7' ], { include_docs: true })
        .then(function(actual) {
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
