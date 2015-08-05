describe('User service', function() {

  'use strict';

  var service,
      $httpBackend,
      username = 'john';

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('Session', function() {
        return {
          userCtx: function() {
            return { name: username };
          }
        };
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('User');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('retrieves user', function(done) {

    var expected = { fullname: 'John Smith' };

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user%3A' + username)
      .respond(expected);

    service(function(err, user) {
      chai.expect(err).to.equal(null);
      chai.expect(user).to.deep.equal(expected);
      done();
    });

    $httpBackend.flush();

  });

  it('returns errors', function(done) {

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user%3A' + username)
      .respond(404, 'Not found');

    service(function(err) {
      chai.expect(err).to.equal('Not found');
      done();
    });

    $httpBackend.flush();

  });

});

