const chai = require('chai');
const sinon = require('sinon');
const Search = require('../src/search');
const GenerateSearchRequests = require('../src/generate-search-requests');

describe('Search service', function() {

  'use strict';

  let service;
  let DB;

  beforeEach(function() {
    GenerateSearchRequests.generate = sinon.stub();
    GenerateSearchRequests.shouldSortByLastVisitedDate = sinon.stub();
    DB = {
      query: sinon.stub()
    };

    service = Search(Promise, DB);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('reports', function() {

    it('returns error when DB.query errors when no filters', function() {
      GenerateSearchRequests.generate.returns([{
        view: 'medic-client/reports_by_date',
        ordered: true,
        params: {
          descending: true
        }
      }]);
      DB.query.returns(Promise.reject('boom'));
      return service('reports', {})
        .then(function() {
          throw new Error('expected error to be thrown');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('boom');
          chai.expect(GenerateSearchRequests.generate.calledOnce).to.equal(true);
          chai.expect(DB.query.calledOnce).to.equal(true);
        });
    });

    it('handles no rows when no filters', function() {
      GenerateSearchRequests.generate.returns([{
        view: 'medic-client/reports_by_date',
        ordered: true,
        params: {
          descending: true
        }
      }]);
      DB.query.returns(Promise.resolve({ rows: [] }));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual.docIds.length).to.equal(0);
          chai.expect(GenerateSearchRequests.generate.calledOnce).to.equal(true);
          chai.expect(DB.query.calledOnce).to.equal(true);
        });
    });

    it('returns results when no filters', function() {
      GenerateSearchRequests.generate.returns([{
        view: 'medic-client/reports_by_date',
        ordered: true,
        params: {
          descending: true
        }
      }]);
      DB.query.returns(Promise.resolve({ rows: [ { id: 3 }, { id: 4 } ] }));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual.docIds.length).to.equal(2);
          chai.expect(actual).to.deep.equal({ docIds: [3, 4] });
          chai.expect(GenerateSearchRequests.generate.callCount).to.equal(1);
          chai.expect(DB.query.callCount).to.equal(1);
          chai.expect(DB.query.args[0][0]).to.equal('medic-client/reports_by_date');
          chai.expect(DB.query.args[0][1]).to.deep.equal({ descending: true, limit: 50, skip: 0 });
        });
    });

    it('returns results when one filter', function() {
      const expected = { docIds: [ 'a', 'b' ] };
      GenerateSearchRequests.generate.returns([{
        view: 'get_stuff',
        params: { key: [ 'a' ] }
      }]);
      DB.query.returns(Promise.resolve({ rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 } ] }));
      return service('reports', {}, { limit: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.generate.calledOnce).to.equal(true);
          chai.expect(DB.query.calledOnce).to.equal(true);
          chai.expect(DB.query.args[0][0]).to.equal('get_stuff');
          // when there's only one filter we can get the db to do the pagination
          chai.expect(DB.query.args[0][1]).to.deep.equal({ key: [ 'a' ] });
        });
    });

    it('removes duplicates before pagination', function() {
      const expected = { docIds: [ 'a', 'b' ] };
      GenerateSearchRequests.generate.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      DB.query.returns(Promise.resolve(
        { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'a', value: 1 } ] }
      ));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.generate.calledOnce).to.equal(true);
          chai.expect(DB.query.calledOnce).to.equal(true);
          chai.expect(DB.query.args[0][0]).to.equal('get_stuff');
          chai.expect(DB.query.args[0][1].key).to.deep.equal([ 'a' ]);
        });
    });

    it('sorts and limits results', function() {
      const viewResult = { rows: [] };
      for (let i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: i });
      }
      GenerateSearchRequests.generate.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      DB.query.returns(Promise.resolve(viewResult));
      return service('reports', {}, { limit: 10 })
        .then(function(actual) {
          // Intersection gets rid of 0-5,
          chai.expect(actual).to.deep.equal({ docIds: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] });
          chai.expect(DB.query.callCount).to.equal(2);
        });
    });

    it('sorts and skips results', function() {
      const viewResult = { rows: [] };
      for (let i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: i });
      }
      GenerateSearchRequests.generate.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      DB.query.returns(Promise.resolve(viewResult));
      return service('reports', {}, { skip: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal({ docIds: [0, 1, 2, 3, 4] });
          chai.expect(DB.query.callCount).to.equal(2);
        });
    });

    it('returns the last page correctly when reverse sorted - #2411', function() {
      const viewResult = { rows: [] };
      for (let i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: 15 - i });
      }
      GenerateSearchRequests.generate.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      DB.query.returns(Promise.resolve(viewResult));
      return service('reports', {}, { skip: 14, limit: 5 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal({ docIds: [14] });
          chai.expect(DB.query.callCount).to.equal(2);
        });
    });

    it('returns results when multiple filters', function() {
      const expected = { docIds: [ 'a', 'b' ] };
      GenerateSearchRequests.generate.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
      ]);
      DB.query.onCall(0).returns(Promise.resolve(
        { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] }
      ));
      DB.query.onCall(1).returns(Promise.resolve(
        { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'd', value: 4 } ] }
      ));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.generate.callCount).to.equal(1);
          chai.expect(DB.query.calledTwice).to.equal(true);
          chai.expect(DB.query.args[0][0]).to.equal('get_stuff');
          chai.expect(DB.query.args[0][1]).to.deep.equal({ key: [ 'a' ] });
          chai.expect(DB.query.args[1][0]).to.equal('get_moar_stuff');
          chai.expect(DB.query.args[1][1]).to.deep.equal({ startkey: [ {} ] });
        });
    });

    it('returns error when one of the filters errors', function() {
      GenerateSearchRequests.generate.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
      ]);
      DB.query.onCall(0).returns(Promise.resolve(
        { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] }
      ));
      DB.query.onCall(1).returns(Promise.reject('boom'));
      return service('reports', {})
        .then(function() {
          throw new Error('expected error to be thrown');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('boom');
          chai.expect(GenerateSearchRequests.generate.callCount).to.equal(1);
          chai.expect(DB.query.callCount).to.equal(2);
        });
    });

    it('does not slice with negative end index when skip is greater than nbr of results #4610', function() {
      const viewResult = { rows: Array.apply(null, Array(50)).map((val, i) => ({ id: i, value: i })) };

      GenerateSearchRequests.generate.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      DB.query.returns(Promise.resolve(viewResult));
      return service('reports', {}, { skip: 60, limit: 3 })
        .then(function(actual) {
          chai.expect(actual.docIds.length).to.equal(0);
          chai.expect(actual).to.deep.equal({ docIds: [] });
          chai.expect(DB.query.callCount).to.equal(2);
        });
    });

  });

  describe('contacts', function() {

    it('sorts and limits contacts results', function() {
      const viewResult = { rows: [] };
      for (let i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: i });
      }
      const expected = { docIds: [] };
      for (let j = 0; j < 10; j++) {
        expected.docIds.push(j);
      }
      GenerateSearchRequests.generate.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      DB.query.onCall(0).returns(Promise.resolve(viewResult));
      DB.query.onCall(1).returns(Promise.resolve(viewResult));
      return service('contacts', {}, { limit: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
        });
    });

    it('sorts and skips contacts results', function() {
      const viewResult = { rows: [] };
      for (let i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: i });
      }
      const expected = { docIds: [] };
      for (let j = 10; j < 15; j++) {
        expected.docIds.push(j);
      }
      GenerateSearchRequests.generate.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      DB.query.onCall(0).returns(Promise.resolve(viewResult));
      DB.query.onCall(1).returns(Promise.resolve(viewResult));
      return service('contacts', {}, { skip: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
        });
    });

    it('unions views when necessary - #2445', function() {
      // this tests a performance tweak for a specific use case
      const expected = { docIds: ['a', 'b', 'c'] };
      GenerateSearchRequests.generate.returns([ {
        view: 'get_stuff',
        union: true,
        paramSets: [ { key: [ 'a' ] }, { key: [ 'b' ] } ]
      } ]);
      DB.query.onCall(0).returns(Promise.resolve({ rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 } ] }));
      DB.query.onCall(1).returns(Promise.resolve({ rows: [ { id: 'b', value: 2 }, { id: 'c', value: 3 } ] }));
      return service('contacts', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.generate.callCount).to.equal(1);
          chai.expect(DB.query.callCount).to.equal(2);
          chai.expect(DB.query.args[0][0]).to.equal('get_stuff');
          chai.expect(DB.query.args[0][1]).to.deep.equal({ key: [ 'a' ] });
          chai.expect(DB.query.args[1][0]).to.equal('get_stuff');
          chai.expect(DB.query.args[1][1]).to.deep.equal({ key: [ 'b' ] });
        });
    });

    it('should return extended results when sorting by last visited date', function() {
      GenerateSearchRequests.shouldSortByLastVisitedDate.returns(true);
      GenerateSearchRequests.generate.returns([
        { view: 'contacts_by_type', params: { key: 'clinic' } },
        { view: 'contacts_by_last_visited', params: { reduce: true } }
      ]);
      DB.query.onCall(0).resolves({ rows: [{ id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 }] });
      DB.query.onCall(1).resolves({ rows: [{ id: 'a', value: 12 }, { id: 'b', value: 13 }, { id: 'd', value: 18 }] });

      return service('contacts', {}, {}, { sortByLastVisitedDate: true }).then(function(result) {
        chai.expect(result).to.deep.equal({
          docIds: ['a', 'b'],
          queryResultsCache: [{ id: 'a', value: 12 }, { id: 'b', value: 13 }]
        });
        chai.expect(DB.query.callCount).to.equal(2);
        chai.expect(DB.query.args[0]).to.deep.equal(['contacts_by_type', { key: 'clinic' }]);
        chai.expect(DB.query.args[1]).to.deep.equal(['contacts_by_last_visited', { reduce: true }]);
      });
    });

    it('should sort muted contacts to the bottom when sorting by last visited date', () => {
      GenerateSearchRequests.shouldSortByLastVisitedDate.returns(true);
      GenerateSearchRequests.generate.returns([
        { view: 'contacts_by_type', params: { key: 'clinic' }, map: row => {
          const [muted, dead] = row.value.split(' ');
          row.sort = muted + ' ' + dead;
          return row;
        }},
        { view: 'contacts_by_last_visited', params: { reduce: true } }
      ]);

      DB.query.onCall(0).resolves({
        rows: [
          { id: 'a', value: 'false false maria' },
          { id: 'b', value: 'false false george' },
          { id: 'c', value: 'false false claire' },
          { id: 'd', value: 'true false stan' },
          { id: 'e', value: 'true false francine' },
          { id: 'f', value: 'true true bud' },
          { id: 'g', value: 'true true homer' }
        ]
      });
      DB.query.onCall(1).resolves({
        rows: [
          { id: 'e', value: 1557755132000 },
          { id: 'b', value: 1557755132001 },
          { id: 'g', value: 1557755132002 },
          { id: 'f', value: 1557755132003 },
          { id: 'c', value: 1557755132004 },
          { id: 'd', value: 1557755132005 },
          { id: 'a', value: 1557755132006 }
        ]
      });

      return service('contacts', {}, {}, { sortByLastVisitedDate: true }).then(result => {
        chai.expect(result).to.deep.equal({
          docIds: ['b', 'c', 'a', 'e', 'd', 'g', 'f'],
          queryResultsCache: [
            { id: 'a', value: 1557755132006, sort: 'false false 1557755132006' },
            { id: 'b', value: 1557755132001, sort: 'false false 1557755132001' },
            { id: 'c', value: 1557755132004, sort: 'false false 1557755132004' },
            { id: 'd', value: 1557755132005, sort: 'true false 1557755132005' },
            { id: 'e', value: 1557755132000, sort: 'true false 1557755132000' },
            { id: 'f', value: 1557755132003, sort: 'true true 1557755132003' },
            { id: 'g', value: 1557755132002, sort: 'true true 1557755132002' },
          ]
        });
        chai.expect(DB.query.callCount).to.equal(2);
        chai.expect(DB.query.args[0]).to.deep.equal(['contacts_by_type', { key: 'clinic' }]);
        chai.expect(DB.query.args[1]).to.deep.equal(['contacts_by_last_visited', { reduce: true }]);
      });
    });

  });

});
