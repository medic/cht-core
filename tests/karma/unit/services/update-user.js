describe('UpdateUser service', function() {

  'use strict';

  var service,
      cacheRemove,
      $httpBackend,
      get,
      put;

  beforeEach(function() {
    get = sinon.stub();
    put = sinon.stub();
    cacheRemove = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get, put: put }));
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
    KarmaUtils.restore(cacheRemove, get, put);
  });

  it('creates a user', function(done) {

    var settings = {
      name: 'sally',
      favcolour: 'aqua',
      starsign: 'libra'
    };

    var user = {
      name: 'sally',
      facility_id: 'b'
    };

    var expectedUser = {
      _id: 'org.couchdb.user:sally',
      type: 'user',
      name: 'sally',
      facility_id: 'b'
    };

    var expectedSettings = {
      _id: 'org.couchdb.user:sally',
      type: 'user-settings',
      name: 'sally',
      favcolour: 'aqua',
      starsign: 'libra'
    };

    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user%3Asally', JSON.stringify(expectedUser))
      .respond(201, '');

    put.returns(KarmaUtils.mockPromise());

    service(null, settings, user, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.firstCall.args[0]).to.equal('/_users/org.couchdb.user%3Asally');
      chai.expect(cacheRemove.secondCall.args[0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.thirdCall.args[0]).to.equal('/_config/admins');
      chai.expect(put.callCount).to.equal(1);
      chai.expect(put.firstCall.args[0]).to.deep.equal(expectedSettings);
      done();
    });

    $httpBackend.flush();
  });

  it('updates the user', function(done) {

    var user = {
      name: 'jerome',
      facility_id: 'b'
    };

    var settings = {
      name: 'jerome',
      favcolour: 'aqua',
      starsign: 'libra'
    };

    var expectedUser = {
      _id: 'org.couchdb.user:jerome',
      name: 'jerome',
      facility_id: 'b'
    };

    var expectedSettings = {
      _id: 'org.couchdb.user:jerome',
      type: 'user-settings',
      name: 'jerome',
      favcolour: 'aqua',
      starsign: 'libra'
    };

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user%3Ajerome')
      .respond({ _id: 'org.couchdb.user:jerome', name: 'jerome', facility_id: 'a' });

    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user%3Ajerome', JSON.stringify(expectedUser))
      .respond(201, '');

    get.returns(KarmaUtils.mockPromise(null, {
      _id: 'org.couchdb.user:jerome',
      type: 'user-settings',
      name: 'jerome',
      favcolour: 'teal'
    }));
    put.returns(KarmaUtils.mockPromise());

    service('org.couchdb.user:jerome', settings, user, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(cacheRemove.callCount).to.equal(3);
      chai.expect(cacheRemove.firstCall.args[0]).to.equal('/_users/org.couchdb.user%3Ajerome');
      chai.expect(cacheRemove.secondCall.args[0]).to.equal('/_users/_all_docs?include_docs=true');
      chai.expect(cacheRemove.thirdCall.args[0]).to.equal('/_config/admins');
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.firstCall.args[0]).to.deep.equal('org.couchdb.user:jerome');
      chai.expect(put.callCount).to.equal(1);
      chai.expect(put.firstCall.args[0]).to.deep.equal(expectedSettings);
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
      _id: 'org.couchdb.user:jerome',
      name: 'jerome',
      favcolour: 'aqua',
      starsign: 'libra',
      password: 'xyz'
    };

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user%3Ajerome')
      .respond({ _id: 'org.couchdb.user:jerome', name: 'jerome', favcolour: 'turquoise', derived_key: 'abc', salt: 'def' });

    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user%3Ajerome', JSON.stringify(expected))
      .respond(201, '');

    service('org.couchdb.user:jerome', null, updates, function(err) {
      chai.expect(err).to.equal(undefined);
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
      _id: 'org.couchdb.user:gareth',
      name: 'gareth',
      favcolour: 'aqua',
      starsign: 'libra',
      password: 'xyz'
    };

    $httpBackend
      .expect('GET', '/_users/org.couchdb.user%3Agareth')
      .respond({ _id: 'org.couchdb.user:gareth', name: 'gareth', favcolour: 'turquoise', derived_key: 'abc', salt: 'def' });

    $httpBackend
      .expect('PUT', '/_users/org.couchdb.user%3Agareth', JSON.stringify(expected))
      .respond(201, '');

    $httpBackend
      .expect('PUT', '/_config/admins/gareth', '"xyz"')
      .respond(201, '');

    service('org.couchdb.user:gareth', null, updates, function(err) {
      chai.expect(err).to.equal(undefined);
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
      .expect('GET', '/_users/org.couchdb.user%3Ajerome')
      .respond(503, 'Server error');

    var updates = {
      favcolour: 'aqua',
      starsign: 'libra'
    };

    service('org.couchdb.user:jerome', null, updates, function(err) {
      chai.expect(err).to.equal('Server error');
      chai.expect(cacheRemove.callCount).to.equal(0);
      done();
    });

    $httpBackend.flush();
  });

  it('can update settings only', function(done) {

    var updates = {
      favcolour: 'aqua',
      starsign: 'libra'
    };

    var expectedSettings = {
      _id: 'org.couchdb.user:jerome',
      type: 'user-settings',
      name: 'jerome',
      favcolour: 'aqua',
      starsign: 'libra'
    };

    get.returns(KarmaUtils.mockPromise(null, {
      _id: 'org.couchdb.user:jerome',
      type: 'user-settings',
      name: 'jerome',
      favcolour: 'teal'
    }));
    put.returns(KarmaUtils.mockPromise());

    service('org.couchdb.user:jerome', updates, function(err) {
      chai.expect(err).to.equal(undefined);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.firstCall.args[0]).to.deep.equal('org.couchdb.user:jerome');
      chai.expect(put.callCount).to.equal(1);
      chai.expect(put.firstCall.args[0]).to.deep.equal(expectedSettings);
      done();
    });
  });

});
