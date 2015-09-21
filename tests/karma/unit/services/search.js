describe('Search service', function() {

  'use strict';

  var service,
      allDocs,
      DbView,
      GenerateSearchRequests,
      scope,
      options;

  beforeEach(function() {
    DbView = sinon.stub();
    GenerateSearchRequests = sinon.stub();
    allDocs = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ allDocs: allDocs }));
      $provide.factory('DbView', function() {
        return DbView;
      });
      $provide.factory('GenerateSearchRequests', function() {
        return GenerateSearchRequests;
      });
    });
    inject(function($injector) {
      service = $injector.get('Search');
    });
    scope = {
      filterModel: {
        type: 'reports',
        date: {},
        forms: []
      }
    };
    options = {};
  });

  afterEach(function() {
    KarmaUtils.restore(allDocs);
  });

  it('returns error when GenerateSearchRequests errors', function(done) {
    GenerateSearchRequests.throws(new Error('boom'));
    service(scope, options, function(err) {
      chai.expect(err.message).to.equal('boom');
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      done();
    });
  });

  it('returns error when DbView errors when no filters', function(done) {
    GenerateSearchRequests.returns([{
      view: 'reports_by_date',
      params: {
        include_docs: true,
        descending: true
      }
    }]);
    DbView.callsArgWith(2, 'boom');
    service(scope, options, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      done();
    });
  });

  it('handles no rows when no filters', function(done) {
    GenerateSearchRequests.returns([{
      view: 'reports_by_date',
      params: {
        include_docs: true,
        descending: true
      }
    }]);
    DbView.callsArgWith(2, null, []);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(0);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      done();
    });
  });

  it('returns results when no filters', function(done) {
    var expected = [ { id: 1 }, { id: 2 } ];
    GenerateSearchRequests.returns([{
      view: 'reports_by_date',
      params: {
        include_docs: true,
        descending: true
      }
    }]);
    DbView.callsArgWith(2, null, expected);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('reports_by_date');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        params: { include_docs: true, descending: true, limit: 50, skip: 0 }
      });
      done();
    });
  });

  it('paginates results when no filters', function(done) {
    var expected = [ { id: 1 }, { id: 2 } ];
    options = { limit: 10, skip: 5 };
    GenerateSearchRequests.returns([{
      view: 'reports_by_date',
      params: {
        include_docs: true,
        descending: true
      }
    }]);
    DbView.callsArgWith(2, null, expected);
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('reports_by_date');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        params: { include_docs: true, descending: true, limit: 10, skip: 5 }
      });
      done();
    });
  });

  it('returns results when one filter', function(done) {
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 } ] });
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } }, { doc: { id: 'b' } } ] }));
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([ { id: 'a' }, { id: 'b' } ]);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('get_stuff');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        params: { key: [ 'a' ] }
      });
      chai.expect(allDocs.calledOnce).to.equal(true);
      chai.expect(allDocs.args[0][0].keys).to.deep.equal([ 'a', 'b' ]);
      done();
    });
  });

  it('removes duplicates before pagination', function(done) {
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'a', value: 1 } ] });
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } }, { doc: { id: 'b' } } ] }));
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([ { id: 'a' }, { id: 'b' } ]);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(DbView.args[0][0]).to.equal('get_stuff');
      chai.expect(DbView.args[0][1]).to.deep.equal({
        params: { key: [ 'a' ] }
      });
      chai.expect(allDocs.calledOnce).to.equal(true);
      chai.expect(allDocs.args[0][0].keys).to.deep.equal([ 'a', 'b' ]);
      done();
    });
  });

  it('sorts and limits results', function(done) {
    options.limit = 10;
    var viewResult = { rows: [] };
    for (var i = 0; i < 15; i++) {
      viewResult.rows.push({ id: i, value: i });
    }
    var expected = [];
    for (var j = 5; j < 15; j++) {
      expected.push(j);
    }
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, viewResult);
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
    service(scope, options, function() {
      chai.expect(allDocs.calledOnce).to.equal(true);
      chai.expect(allDocs.args[0][0].keys.length).to.equal(10);
      chai.expect(allDocs.args[0][0].keys).to.deep.equal(expected);
      done();
    });
  });

  it('sorts and skips results', function(done) {
    options.skip = 10;
    var viewResult = { rows: [] };
    for (var i = 0; i < 15; i++) {
      viewResult.rows.push({ id: i, value: i });
    }
    var expected = [];
    for (var j = 0; j < 5; j++) {
      expected.push(j);
    }
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, viewResult);
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
    service(scope, options, function() {
      chai.expect(allDocs.calledOnce).to.equal(true);
      chai.expect(allDocs.args[0][0].keys.length).to.equal(5);
      chai.expect(allDocs.args[0][0].keys).to.deep.equal(expected);
      done();
    });
  });

  it('returns results when multiple filters', function(done) {
    GenerateSearchRequests.returns([
      { view: 'get_stuff', params: { key: [ 'a' ] } },
      { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
    ]);
    DbView.onCall(0).callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] });
    DbView.onCall(1).callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'd', value: 4 } ] });
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } }, { doc: { id: 'b' } } ] }));
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
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
      done();
    });
  });

  it('returns error when one of the filters errors', function(done) {
    GenerateSearchRequests.returns([
      { view: 'get_stuff', params: { key: [ 'a' ] } },
      { view: 'get_moar_stuff', params: { startkey: [ {} ] } }
    ]);
    DbView.onCall(0).callsArgWith(2, null, { rows: [ { id: 'a', value: 1 }, { id: 'b', value: 2 }, { id: 'c', value: 3 } ] });
    DbView.onCall(1).callsArgWith(2, 'boom');
    service(scope, options, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledTwice).to.equal(true);
      done();
    });
  });

  it('does not get when no ids', function(done) {
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, { rows: [] });
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([]);
      chai.expect(GenerateSearchRequests.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
      chai.expect(allDocs.callCount).to.equal(0);
      done();
    });
  });

  it('debounces if the same query is executed twice', function() {
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
    DbView.callsArgWithAsync(2, null, { rows: [ { id: 'a', value: 1 } ] });
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } } ] }));
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
    });
    service(scope, {}, function() {
      // this callback should never be called
      chai.expect(true).to.equal(false);
    });
  });

  it('does not debounce different queries', function() {
    GenerateSearchRequests
      .onFirstCall().returns([ { view: 'get_stuff', params: { id: 'a' } } ])
      .onSecondCall().returns([ { view: 'get_stuff', params: { id: 'b' } } ]);
    DbView
      .onFirstCall().callsArgWith(2, null, { rows: [ { id: 'a', value: 1 } ] })
      .onSecondCall().callsArgWith(2, null, { rows: [ { id: 'b', value: 2 } ] });
    allDocs
      .onFirstCall().returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } } ] }))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'b' } } ] }));
    var finished = 0;
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
      chai.expect(finished++).to.equal(0);
    });
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([ { id: 'b' } ]);
      chai.expect(finished++).to.equal(1);
    });
  });

  it('does not debounce subsequent queries', function(done) {
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { } } ]);
    DbView.callsArgWith(2, null, { rows: [ { id: 'a', value: 1 } ] });
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: { id: 'a' } } ] }));
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
      service(scope, {}, function(err, actual) {
        chai.expect(err).to.equal(null);
        chai.expect(actual).to.deep.equal([ { id: 'a' } ]);
        done();
      });
    });
  });

  it('sorts and limits contacts results', function(done) {
    scope.filterModel.type = 'contacts';
    options.limit = 10;
    var viewResult = { rows: [] };
    for (var i = 0; i < 15; i++) {
      viewResult.rows.push({ id: i, value: i });
    }
    var expected = [];
    for (var j = 0; j < 10; j++) {
      expected.push(j);
    }
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, viewResult);
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
    service(scope, options, function() {
      chai.expect(allDocs.calledOnce).to.equal(true);
      chai.expect(allDocs.args[0][0].keys.length).to.equal(10);
      chai.expect(allDocs.args[0][0].keys).to.deep.equal(expected);
      done();
    });
  });

  it('sorts and skips contacts results', function(done) {
    scope.filterModel.type = 'contacts';
    options.skip = 10;
    var viewResult = { rows: [] };
    for (var i = 0; i < 15; i++) {
      viewResult.rows.push({ id: i, value: i });
    }
    var expected = [];
    for (var j = 10; j < 15; j++) {
      expected.push(j);
    }
    GenerateSearchRequests.returns([ { view: 'get_stuff', params: { key: [ 'a' ] } } ]);
    DbView.callsArgWith(2, null, viewResult);
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
    service(scope, options, function() {
      chai.expect(allDocs.calledOnce).to.equal(true);
      chai.expect(allDocs.args[0][0].keys.length).to.equal(5);
      chai.expect(allDocs.args[0][0].keys).to.deep.equal(expected);
      done();
    });
  });
});
