describe('HttpWrapper service', function() {

  'use strict';

  var service,
      $httpBackend,
      ActiveRequests;

  beforeEach(function() {
    module('inboxApp');
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('HttpWrapper');
      ActiveRequests = $injector.get('ActiveRequests');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('get requests complete successfully', function(done) {
    var expected = { _id: 'abc' };
    $httpBackend
      .expect('GET', '/_users/abc')
      .respond(200, expected);

    service.get('/_users/abc').success(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });

    $httpBackend.flush();
  });

  it('get returns errors', function(done) {
    $httpBackend
      .expect('GET', '/_users/abc')
      .respond(404, 'Not found');

    service.get('/_users/abc').error(function(actual) {
      chai.expect(actual).to.equal('Not found');
      done();
    });

    $httpBackend.flush();
  });

  it('get requests timeout', function(done) {
    var expected = { _id: 'abc' };
    $httpBackend
      .expect('GET', '/_users/abc')
      .respond(200, expected);

    service.get('/_users/abc').error(function(err) {
      chai.expect(err).to.equal(undefined);
      done();
    });

    ActiveRequests.cancel({}, { name: 'test' });
    $httpBackend.flush();
  });

  it('get ignores timeout if targetScope is root', function(done) {
    var expected = { _id: 'abc' };
    $httpBackend
      .expect('GET', '/_users/abc')
      .respond(200, expected);

    service.get('/_users/abc', { targetScope: "root" }).success(function(actual) {
      chai.expect(actual).to.deep.equal(expected);
      done();
    });

    ActiveRequests.cancel({}, { name: 'test' });
    $httpBackend.flush();
  });

  it('put requests complete successfully', function(done) {
    var expected = { _id: 'abc', name: 'gareth' };
    $httpBackend
      .expect('PUT', '/_users/abc', expected)
      .respond(200, 'Done');

    service.put('/_users/abc', expected).success(function(actual) {
      chai.expect(actual).to.deep.equal('Done');
      done();
    });

    $httpBackend.flush();
  });

  it('put requests timeout', function(done) {
    var expected = { _id: 'abc', name: 'gareth' };
    $httpBackend
      .expect('PUT', '/_users/abc', expected)
      .respond(200, 'Done');

    service.put('/_users/abc', expected).error(function(err) {
      chai.expect(err).to.equal(undefined);
      done();
    });

    ActiveRequests.cancel({}, { name: 'test' });
    $httpBackend.flush();
  });

  it('put ignores timeout if targetScope is root', function(done) {
    var expected = { _id: 'abc', name: 'gareth' };
    $httpBackend
      .expect('PUT', '/_users/abc', expected)
      .respond(200, 'Done');

    service.put('/_users/abc', expected, { targetScope: 'root' }).success(function(actual) {
      chai.expect(actual).to.deep.equal('Done');
      done();
    });

    ActiveRequests.cancel({}, { name: 'test' });
    $httpBackend.flush();
  });

  it('head requests complete successfully', function(done) {
    $httpBackend
      .expect('HEAD', '/_users/abc')
      .respond(200, 'Found');

    service.head('/_users/abc').success(function(actual) {
      chai.expect(actual).to.deep.equal('Found');
      done();
    });

    $httpBackend.flush();
  });
  
  it('head requests timeout', function(done) {
    $httpBackend
      .expect('HEAD', '/_users/abc')
      .respond(200, 'Found');

    service.head('/_users/abc').error(function(err) {
      chai.expect(err).to.equal(undefined);
      done();
    });

    ActiveRequests.cancel({}, { name: 'test' });
    $httpBackend.flush();
  });

  it('head ignores timeout if targetScope is root', function(done) {
    $httpBackend
      .expect('HEAD', '/_users/abc')
      .respond(200, 'Found');

    service.head('/_users/abc', { targetScope: 'root' }).success(function(actual) {
      chai.expect(actual).to.deep.equal('Found');
      done();
    });

    ActiveRequests.cancel({}, { name: 'test' });
    $httpBackend.flush();
  });

});
