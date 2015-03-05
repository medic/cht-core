describe('Search service', function() {

  'use strict';

  var service,
      schema,
      generateError,
      formatError,
      query,
      scope,
      $httpBackend;

  beforeEach(function (){
    module('inboxApp');
    module(function ($provide) {
      $provide.value('GenerateSearchQuery', function(scope, callback) {
        callback(generateError, {
          schema: schema,
          query: query
        });
      });
      $provide.value('FormatDataRecord', function(rows, callback) {
        callback(formatError, rows);
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('Search');
    });
    schema = null;
    query = null;
    generateError = null;
    formatError = null;
    scope = {};
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('returns error when generate errors', function(done) {
    generateError = 'boom';
    service(scope, {}, function(err) {
      chai.expect(err).to.deep.equal('boom');
      done();
    });
  });

  it('returns error when get errors', function(done) {
    $httpBackend
      .expect('GET', '/api/v1/fti/data_records?include_docs=true&index=data_records&limit=50&sort=%5Creported_date%3Cdate%3E')
      .respond(503, 'boom');
    service(scope, {}, function(err) {
      chai.expect(err.data).to.equal('boom');
      chai.expect(err.status).to.equal(503);
      done();
    });
    $httpBackend.flush();
  });

  it('handles no rows', function(done) {
    var expected = [];
    $httpBackend
      .expect('GET', '/api/v1/fti/data_records?include_docs=true&index=data_records&limit=50&sort=%5Creported_date%3Cdate%3E')
      .respond({ rows: expected, total_rows: 100 });
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.total_rows).to.equal(100);
      chai.expect(actual.results).to.deep.equal(expected);
      done();
    });
    $httpBackend.flush();
  });

  it('returns results', function(done) {
    var expected = [ { _id: 1 }, { _id: 2 } ];
    $httpBackend
      .expect('GET', '/api/v1/fti/data_records?include_docs=true&index=data_records&limit=50&sort=%5Creported_date%3Cdate%3E')
      .respond({ rows: expected, total_rows: 100 });
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.total_rows).to.equal(100);
      chai.expect(actual.results).to.deep.equal(expected);
      done();
    });
    $httpBackend.flush();
  });

  it('uses provided options', function(done) {
    var expected = [ { _id: 1 }, { _id: 2 } ];
    var options = {
      index: 'contacts',
      limit: 100,
      sort: 'name',
      include_docs: false
    };
    $httpBackend
      .expect('GET', '/api/v1/fti/contacts?include_docs=false&index=contacts&limit=100&sort=name')
      .respond({ rows: expected, total_rows: 100 });
    service(scope, options, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.total_rows).to.equal(100);
      chai.expect(actual.results).to.deep.equal(expected);
      done();
    });
    $httpBackend.flush();
  });

  it('debounces if the same query is executed twice', function(done) {
    var expected = [ { _id: 1 }, { _id: 2 } ];
    $httpBackend
      .expect('GET', '/api/v1/fti/data_records?include_docs=true&index=data_records&limit=50&sort=%5Creported_date%3Cdate%3E')
      .respond({ rows: expected, total_rows: 100 });
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.total_rows).to.equal(100);
      chai.expect(actual.results).to.deep.equal(expected);
      done();
    });
    service(scope, {}, function() {
      // this callback should never be called
      chai.assert.fail();
    });
    $httpBackend.flush();
  });

  it('does not debounce different queries', function(done) {
    var expected1 = [ { _id: 1 }, { _id: 2 } ];
    var expected2 = [ { _id: 3 }, { _id: 4 } ];
    $httpBackend
      .expect('GET', '/api/v1/fti/data_records?include_docs=true&index=data_records&limit=50&sort=%5Creported_date%3Cdate%3E')
      .respond({ rows: expected1, total_rows: 100 });
    $httpBackend
      .expect('GET', '/api/v1/fti/data_records?include_docs=false&index=data_records&limit=50&sort=%5Creported_date%3Cdate%3E')
      .respond({ rows: expected2, total_rows: 100 });
    
    var finished = 0;
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.total_rows).to.equal(100);
      chai.expect(actual.results).to.deep.equal(expected1);
      if (++finished === 2) {
        done();
      }
    });
    service(scope, { include_docs: false }, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.total_rows).to.equal(100);
      chai.expect(actual.results).to.deep.equal(expected2);
      if (++finished === 2) {
        done();
      }
    });
    $httpBackend.flush();
  });

  it('does not debounce subsequent queries', function(done) {
    var expected = [ { _id: 1 }, { _id: 2 } ];
    $httpBackend
      .expect('GET', '/api/v1/fti/data_records?include_docs=true&index=data_records&limit=50&sort=%5Creported_date%3Cdate%3E')
      .respond({ rows: expected, total_rows: 100 });
    $httpBackend
      .expect('GET', '/api/v1/fti/data_records?include_docs=true&index=data_records&limit=50&sort=%5Creported_date%3Cdate%3E')
      .respond({ rows: expected, total_rows: 100 });
    
    service(scope, {}, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.total_rows).to.equal(100);
      chai.expect(actual.results).to.deep.equal(expected);
      service(scope, {}, function(err, actual) {
        chai.expect(err).to.equal(null);
        chai.expect(actual.total_rows).to.equal(100);
        chai.expect(actual.results).to.deep.equal(expected);
        done();
      });
    });
    $httpBackend.flush();
  });

});
