describe('Search service', function() {

  'use strict';

  var service,
      dbQuery,
      GenerateSearchRequests,
      GetDataRecords;

  beforeEach(function() {
    dbQuery = sinon.stub();
    GenerateSearchRequests = sinon.stub();
    GetDataRecords = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ query: dbQuery }));
      $provide.value('GenerateSearchRequests', GenerateSearchRequests);
      $provide.value('GetDataRecords', GetDataRecords);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function($injector) {
      service = $injector.get('Search');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(dbQuery, GenerateSearchRequests, GetDataRecords);
  });

  describe('reports', function() {

    it('returns error when dbQuery errors when no filters', function() {
      GenerateSearchRequests.returns([{
        view: 'medic-client/reports_by_date',
        ordered: true,
        params: {
          descending: true
        }
      }]);
      dbQuery.returns(KarmaUtils.mockPromise('boom'));
      return service('reports', {})
        .then(function() {
          throw new Error('expected error to be thrown');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('boom');
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(dbQuery.calledOnce).to.equal(true);
        });
    });

    it('handles no rows when no filters', function() {
      GenerateSearchRequests.returns([{
        view: 'medic-client/reports_by_date',
        ordered: true,
        params: {
          descending: true
        }
      }]);
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, []));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual.length).to.equal(0);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(dbQuery.calledOnce).to.equal(true);
        });
    });

    it('returns results when no filters', function() {
      var expected = [ { id: 1 }, { id: 2 } ];
      GenerateSearchRequests.returns([{
        view: 'medic-client/reports_by_date',
        ordered: true,
        params: {
          descending: true
        }
      }]);
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ { id: 3 }, { id: 4 } ] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, expected));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.callCount).to.equal(1);
          chai.expect(dbQuery.callCount).to.equal(1);
          chai.expect(dbQuery.args[0][0]).to.equal('medic-client/reports_by_date');
          chai.expect(dbQuery.args[0][1]).to.deep.equal({ descending: true, limit: 50, skip: 0 });
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal([ 3, 4 ]);
          chai.expect(GetDataRecords.args[0][1]).to.deep.equal({ limit: 50, skip: 0 });
        });
    });

    it('returns results when one filter', function() {
      var expected = [ { id: 'a' }, { id: 'b' } ];
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 } ] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, expected));
      return service('reports', {}, { limit: 10, skip: 5 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(dbQuery.calledOnce).to.equal(true);
          chai.expect(dbQuery.args[0][0]).to.equal('get_stuff');
          // when there's only one filter we can get the db to do the pagination
          chai.expect(dbQuery.args[0][1]).to.deep.equal({ key: [ 'a' ] });
          chai.expect(GetDataRecords.callCount).to.equal(1);
        });
    });

    it('removes duplicates before pagination', function() {
      var expected = [ { id: 'a' }, { id: 'b' } ];
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'a', value: 1 } ] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, expected));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(dbQuery.calledOnce).to.equal(true);
          chai.expect(dbQuery.args[0][0]).to.equal('get_stuff');
          chai.expect(dbQuery.args[0][1].key).to.deep.equal([ 'a' ]);
          chai.expect(GetDataRecords.callCount).to.equal(1);
        });
    });

    it('sorts and limits results', function() {
      var viewResult = { rows: [] };
      for (var i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: i });
      }
      var expected = [];
      for (var j = 5; j < 15; j++) {
        expected.push(j);
      }
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      dbQuery.onCall(0).returns(KarmaUtils.mockPromise(null, viewResult));
      dbQuery.onCall(1).returns(KarmaUtils.mockPromise(null, viewResult));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, []));
      return service('reports', {}, { limit: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal(expected);
        });
    });

    it('sorts and skips results', function() {
      var viewResult = { rows: [] };
      for (var i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: i });
      }
      var expected = [];
      for (var j = 0; j < 5; j++) {
        expected.push(j);
      }
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      dbQuery.onCall(0).returns(KarmaUtils.mockPromise(null, viewResult));
      dbQuery.onCall(1).returns(KarmaUtils.mockPromise(null, viewResult));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, []));
      return service('reports', {}, { skip: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal(expected);
        });
    });

    it('returns the last page correctly when reverse sorted - #2411', function() {
      var viewResult = { rows: [] };
      for (var i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: 15 - i });
      }
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      dbQuery.onCall(0).returns(KarmaUtils.mockPromise(null, viewResult));
      dbQuery.onCall(1).returns(KarmaUtils.mockPromise(null, viewResult));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, []));
      return service('reports', {}, { skip: 14, limit: 5 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal([ 14 ]);
        });
    });

    it('returns results when multiple filters', function() {
      var expected = [ { id: 'a' }, { id: 'b' } ];
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
      ]);
      dbQuery.onCall(0).returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] }));
      dbQuery.onCall(1).returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'd', value: 4 } ] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, expected));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.callCount).to.equal(1);
          chai.expect(dbQuery.calledTwice).to.equal(true);
          chai.expect(dbQuery.args[0][0]).to.equal('get_stuff');
          chai.expect(dbQuery.args[0][1]).to.deep.equal({ key: [ 'a' ] });
          chai.expect(dbQuery.args[1][0]).to.equal('get_moar_stuff');
          chai.expect(dbQuery.args[1][1]).to.deep.equal({ startkey: [ {} ] });
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal([ 'a', 'b' ]);
        });
    });

    it('returns error when one of the filters errors', function() {
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
      ]);
      dbQuery.onCall(0).returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] }));
      dbQuery.onCall(1).returns(KarmaUtils.mockPromise('boom'));
      return service('reports', {})
        .then(function() {
          throw new Error('expected error to be thrown');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('boom');
          chai.expect(GenerateSearchRequests.callCount).to.equal(1);
          chai.expect(dbQuery.callCount).to.equal(2);
        });
    });

    it('does not get when no ids', function() {
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: []}));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, []));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(GenerateSearchRequests.callCount).to.equal(1);
          chai.expect(dbQuery.callCount).to.equal(1);
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal([]);
        });
    });

  });

  describe('debouncing', function() {

    it('debounces if the same query is executed twice', function(done) {
      var expected = [ { id: 'a' } ];
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 } ] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, expected));
      service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          setTimeout(done); // defer execution to give the second query time to execute
        });
      service('reports', {})
        .then(function() {
          throw new Error('the second promise should be ignored');
        });
    });

    it('does not debounce if the same query is executed twice with the force option', function() {
      var expected = [ { id: 'a' } ];
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 } ] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, expected));
      var firstReturned = false;
      service('reports', {})
        .then(function(actual) {
          firstReturned = true;
          chai.expect(actual).to.deep.equal(expected);
        });
      return service('reports', {}, { force: true })
        .then(function(actual) {
          chai.expect(firstReturned).to.equal(true);
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
        });
    });

    it('does not debounce different queries', function() {
      GenerateSearchRequests
        .onCall(0).returns([ { view: 'get_stuff', params: { id: 'a' } } ])
        .onCall(1).returns([ { view: 'get_stuff', params: { id: 'b' } } ]);
      dbQuery
        .onCall(0).returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 } ] }))
        .onCall(1).returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'b', value: 2 } ] }));
      GetDataRecords
        .onFirstCall().returns(KarmaUtils.mockPromise(null, [ { id: 'a' } ]))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, [ { id: 'b' } ]));
      var firstReturned = false;
      service('reports', { freetext: 'first' })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
          chai.expect(GenerateSearchRequests.args[0][1].freetext).to.equal('first');
          firstReturned = true;
        });
      return service('reports', { freetext: 'second' })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'b' } ]);
          chai.expect(firstReturned).to.equal(true);
          chai.expect(GenerateSearchRequests.args[1][1].freetext).to.equal('second');
        });
    });

    it('does not debounce subsequent queries', function() {
      var expected = [ { id: 'a' } ];
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 } ] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, expected));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
        })
        .then(function() {
          return service('reports', {});
        })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.callCount).to.equal(2);
          chai.expect(dbQuery.callCount).to.equal(2);
          chai.expect(GetDataRecords.callCount).to.equal(2);
        });
    });

  });

  describe('contacts', function() {

    it('sorts and limits contacts results', function() {
      var viewResult = { rows: [] };
      for (var i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: i });
      }
      var expected = [];
      for (var j = 0; j < 10; j++) {
        expected.push(j);
      }
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      dbQuery.onCall(0).returns(KarmaUtils.mockPromise(null, viewResult));
      dbQuery.onCall(1).returns(KarmaUtils.mockPromise(null, viewResult));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, []));
      return service('contacts', {}, { limit: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal(expected);
        });
    });

    it('sorts and skips contacts results', function() {
      var viewResult = { rows: [] };
      for (var i = 0; i < 15; i++) {
        viewResult.rows.push({ id: i, value: i });
      }
      var expected = [];
      for (var j = 10; j < 15; j++) {
        expected.push(j);
      }
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { key: [ 'b' ] } }
      ]);
      dbQuery.onCall(0).returns(KarmaUtils.mockPromise(null, viewResult));
      dbQuery.onCall(1).returns(KarmaUtils.mockPromise(null, viewResult));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, []));
      return service('contacts', {}, { skip: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal(expected);
        });
    });

    it('unions views when necessary - #2445', function() {
      // this tests a performance tweak for a specific use case
      var expected = [ { id: 'a' }, { id: 'b' }, { id: 'c' } ];
      GenerateSearchRequests.returns([ {
        view: 'get_stuff',
        union: true,
        params: [ { key: [ 'a' ] }, { key: [ 'b' ] } ]
      } ]);
      dbQuery.onCall(0).returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 } ] }));
      dbQuery.onCall(1).returns(KarmaUtils.mockPromise(null, { rows: [ { id: 'b', value: 2 }, { id: 'c', value: 3 } ] }));
      GetDataRecords.returns(KarmaUtils.mockPromise(null, expected));
      return service('contacts', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.callCount).to.equal(1);
          chai.expect(dbQuery.callCount).to.equal(2);
          chai.expect(dbQuery.args[0][0]).to.equal('get_stuff');
          chai.expect(dbQuery.args[0][1]).to.deep.equal({ key: [ 'a' ] });
          chai.expect(dbQuery.args[1][0]).to.equal('get_stuff');
          chai.expect(dbQuery.args[1][1]).to.deep.equal({ key: [ 'b' ] });
          chai.expect(GetDataRecords.callCount).to.equal(1);
          chai.expect(GetDataRecords.args[0][0]).to.deep.equal([ 'a', 'b', 'c' ]);
        });
    });

  });

});
