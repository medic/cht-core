describe('UpdateUser service', function() {

  'use strict';

  var service,
      cacheRemove,
      $httpBackend;

  beforeEach(function() {
    module('inboxApp');
    cacheRemove = sinon.stub();
    module(function ($provide) {
      $provide.value('Admins', function(callback) {
        callback(null, { gareth: true });
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      var $cacheFactory = $injector.get('$cacheFactory');
      $cacheFactory.get = function(name) {
        if (name !== '$http') {
          throw new Error('requesting the wrong cache');
        }
        return { remove: cacheRemove };
      };
      service = $injector.get('UpdateUser');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    KarmaUtils.restore(cacheRemove);
  });

  it('creates a user', function(done) {

    var updates = {
      name: 'sally',
      favcolour: 'aqua',
      starsign: 'libra'
    };

    var expected = {
      name: 'sally',
      favcolour: 'aqua',
      starsign: 'libra',
      _id: 'org.couchdb.user:sally',
      type: 'user'
    };

    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user:sally', JSON.stringify(expected))
      .respond(201, '');

    service(null, updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.firstCall.args[0]).to.equal('/_users/org.couchdb.user%3Asally');
      chai.expect(cacheRemove.secondCall.args[0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.thirdCall.args[0]).to.equal('/_config/admins');
      done();
    });

    $httpBackend.flush();
  });

  it('updates the user', function(done) {

    var updates = {
      favcolour: 'aqua',
      starsign: 'libra'
    };

    var expected = {
      name: 'jerome',
      favcolour: 'aqua',
      starsign: 'libra'
    };

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user:jerome')
      .respond({ name: 'jerome', favcolour: 'turquoise' });

    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user:jerome', JSON.stringify(expected))
      .respond(201, '');

    service('org.couchdb.user:jerome', updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.firstCall.args[0]).to.equal('/_users/org.couchdb.user%3Ajerome');
      chai.expect(cacheRemove.secondCall.args[0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.thirdCall.args[0]).to.equal('/_config/admins');
      done();
    });

    $httpBackend.flush();
  });

  it('updates the password', function(done) {

    var updates = {
      favcolour: 'aqua',
      starsign: 'libra',
      password: 'xyz'
    };

    var expected = {
      name: 'jerome',
      favcolour: 'aqua',
      starsign: 'libra',
      password: 'xyz'
    };

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user:jerome')
      .respond({ name: 'jerome', favcolour: 'turquoise', derived_key: 'abc', salt: 'def' });

    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user:jerome', JSON.stringify(expected))
      .respond(201, '');

    service('org.couchdb.user:jerome', updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(JSON.stringify(actual)).to.equal(JSON.stringify(expected));
      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.firstCall.args[0]).to.equal('/_users/org.couchdb.user%3Ajerome');
      chai.expect(cacheRemove.secondCall.args[0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.thirdCall.args[0]).to.equal('/_config/admins');
      done();
    });

    $httpBackend.flush();
  });


  it('updates the admin password', function(done) {

    var updates = {
      favcolour: 'aqua',
      starsign: 'libra',
      password: 'xyz'
    };

    var expected = {
      name: 'gareth',
      favcolour: 'aqua',
      starsign: 'libra',
      password: 'xyz'
    };

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user:gareth')
      .respond({ name: 'gareth', favcolour: 'turquoise', derived_key: 'abc', salt: 'def' });

    $httpBackend
      .expect('PUT', '/_config/admins/gareth', '"xyz"')
      .respond(201, '');

    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user:gareth', JSON.stringify(expected))
      .respond(201, '');

    service('org.couchdb.user:gareth', updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(JSON.stringify(actual)).to.equal(JSON.stringify(expected));
      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.firstCall.args[0]).to.equal('/_users/org.couchdb.user%3Agareth');
      chai.expect(cacheRemove.secondCall.args[0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.thirdCall.args[0]).to.equal('/_config/admins');
      done();
    });

    $httpBackend.flush();
  });

  it('returns errors', function(done) {

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user:jerome')
      .respond(503, 'Server error');

    var updates = {
      favcolour: 'aqua',
      starsign: 'libra'
    };

    service('org.couchdb.user:jerome', updates, function(err) {
      chai.expect(err.message).to.equal('Server error');
      chai.expect(cacheRemove.callCount).to.equal(0);
      done();
    });

    $httpBackend.flush();
  });

});