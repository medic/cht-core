describe('Search service', function() {

  'use strict';

  var service,
      allDocs,
      DbView,
      GenerateSearchRequests;

  beforeEach(function() {
    DbView = sinon.stub();
    GenerateSearchRequests = sinon.stub();
    allDocs = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ allDocs: allDocs }));
      $provide.value('DbView', DbView);
      $provide.value('GenerateSearchRequests', GenerateSearchRequests);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function($injector) {
      service = $injector.get('Search');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(allDocs);
  });

  describe('reports', function() {

    it('returns error when DbView errors when no filters', function() {
      GenerateSearchRequests.returns([{
        view: 'reports_by_date',
        params: {
          include_docs: true,
          descending: true
        }
      }]);
      DbView.returns(KarmaUtils.mockPromise('boom'));
      return service('reports', {})
        .then(function() {
          throw new Error('expected error to be thrown');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('boom');
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledOnce).to.equal(true);
        });
    });

    it('handles no rows when no filters', function() {
      GenerateSearchRequests.returns([{
        view: 'reports_by_date',
        params: {
          include_docs: true,
          descending: true
        }
      }]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: [] }));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual.length).to.equal(0);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledOnce).to.equal(true);
        });
    });

    it('returns results when no filters', function() {
      var expected = [ { id: 1 }, { id: 2 } ];
      GenerateSearchRequests.returns([{
        view: 'reports_by_date',
        params: {
          include_docs: true,
          descending: true
        }
      }]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: expected }));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledOnce).to.equal(true);
          chai.expect(DbView.args[0][0]).to.equal('reports_by_date');
          chai.expect(DbView.args[0][1]).to.deep.equal({
            params: { include_docs: true, descending: true, limit: 50, skip: 0 }
          });
        });
    });

    it('paginates results when no filters', function() {
      var expected = [ { id: 1 }, { id: 2 } ];
      GenerateSearchRequests.returns([{
        view: 'reports_by_date',
        params: {
          include_docs: true,
          descending: true
        }
      }]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: expected }));
      return service('reports', {}, { limit: 10, skip: 5 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal(expected);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledOnce).to.equal(true);
          chai.expect(DbView.args[0][0]).to.equal('reports_by_date');
          chai.expect(DbView.args[0][1]).to.deep.equal({
            params: { include_docs: true, descending: true, limit: 10, skip: 5 }
          });
        });
    });

    it('returns results when one filter', function() {
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 } ] } }));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } }, { doc: { id: 'b' } } ] }));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' }, { id: 'b' } ]);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledOnce).to.equal(true);
          chai.expect(DbView.args[0][0]).to.equal('get_stuff');
          chai.expect(DbView.args[0][1]).to.deep.equal({
            params: { key: [ 'a' ] }
          });
          chai.expect(allDocs.calledOnce).to.equal(true);
          chai.expect(allDocs.args[0][0].keys).to.deep.equal([ 'a', 'b' ]);
        });
    });

    it('removes duplicates before pagination', function() {
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'a', value: 1 } ] }}));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } }, { doc: { id: 'b' } } ] }));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' }, { id: 'b' } ]);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledOnce).to.equal(true);
          chai.expect(DbView.args[0][0]).to.equal('get_stuff');
          chai.expect(DbView.args[0][1]).to.deep.equal({
            params: { key: [ 'a' ] }
          });
          chai.expect(allDocs.calledOnce).to.equal(true);
          chai.expect(allDocs.args[0][0].keys).to.deep.equal([ 'a', 'b' ]);
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
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: viewResult }));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
      return service('reports', {}, { limit: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(allDocs.calledOnce).to.equal(true);
          chai.expect(allDocs.args[0][0].keys.length).to.equal(10);
          chai.expect(allDocs.args[0][0].keys).to.deep.equal(expected);
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
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: viewResult }));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
      return service('reports', {}, { skip: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(allDocs.calledOnce).to.equal(true);
          chai.expect(allDocs.args[0][0].keys.length).to.equal(5);
          chai.expect(allDocs.args[0][0].keys).to.deep.equal(expected);
        });
    });

    it('returns results when multiple filters', function() {
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
      ]);
      DbView.onCall(0).returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] }}));
      DbView.onCall(1).returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'd', value: 4 } ] }}));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } }, { doc: { id: 'b' } } ] }));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' }, { id: 'b' } ]);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledTwice).to.equal(true);
          chai.expect(DbView.args[0][0]).to.equal('get_stuff');
          chai.expect(DbView.args[0][1]).to.deep.equal({
            params: { key: [ 'a' ] }
          });
          chai.expect(DbView.args[1][0]).to.equal('get_moar_stuff');
          chai.expect(DbView.args[1][1]).to.deep.equal({
            params: { startkey: [ {} ] }
          });
          chai.expect(allDocs.calledOnce).to.equal(true);
          chai.expect(allDocs.args[0][0].keys).to.deep.equal([ 'a', 'b' ]);
        });
    });

    it('returns error when one of the filters errors', function() {
      GenerateSearchRequests.returns([
        { view: 'get_stuff', params: { key: [ 'a' ] } },
        { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
      ]);
      DbView.onCall(0).returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] }}));
      DbView.onCall(1).returns(KarmaUtils.mockPromise('boom'));
      return service('reports', {})
        .then(function() {
          throw new Error('expected error to be thrown');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('boom');
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledTwice).to.equal(true);
        });
    });

    it('does not get when no ids', function() {
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: { rows: [] }}));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
          chai.expect(DbView.calledOnce).to.equal(true);
          chai.expect(allDocs.callCount).to.equal(0);
        });
    });

  });

  describe('debouncing', function() {

    it('debounces if the same query is executed twice', function(done) {
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 } ] }}));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } } ] }));
      service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
          setTimeout(done); // defer execution to give the second query time to execute
        });
      service('reports', {})
        .then(function() {
          throw new Error('the second promise should be ignored');
        });
    });

    it('does not debounce if the same query is executed twice with the force option', function() {
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 } ] }}));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } } ] }));
      var firstReturned = false;
      service('reports', {})
        .then(function(actual) {
          firstReturned = true;
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
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
      DbView
        .onCall(0).returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 } ] }}))
        .onCall(1).returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'b', value: 2 } ] }}));
      allDocs
        .onFirstCall().returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } } ] }))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'b' } } ] }));
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
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: { rows: [ { id: 'a', value: 1 } ] }}));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } } ] }));
      return service('reports', {})
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
        })
        .then(function() {
          return service('reports', {});
        })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
          chai.expect(GenerateSearchRequests.callCount).to.equal(2);
          chai.expect(DbView.callCount).to.equal(2);
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
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: viewResult }));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
      return service('contacts', {}, { limit: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(allDocs.calledOnce).to.equal(true);
          chai.expect(allDocs.args[0][0].keys.length).to.equal(10);
          chai.expect(allDocs.args[0][0].keys).to.deep.equal(expected);
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
      GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
      DbView.returns(KarmaUtils.mockPromise(null, { results: viewResult }));
      allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
      return service('contacts', {}, { skip: 10 })
        .then(function(actual) {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(allDocs.calledOnce).to.equal(true);
          chai.expect(allDocs.args[0][0].keys.length).to.equal(5);
          chai.expect(allDocs.args[0][0].keys).to.deep.equal(expected);
        });
    });

  });

});
