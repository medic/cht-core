describe('UserContact service', function() {

  'use strict';

  var service,
      $rootScope,
      UserSettings,
      get;

  beforeEach(function() {
    get = sinon.stub();
    UserSettings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
      $provide.value('UserSettings', UserSettings);
    });
    inject(function($injector, _$rootScope_) {
      service = $injector.get('UserContact');
      $rootScope = _$rootScope_;
    });
  });

  it('returns error from user settings', function(done) {
    UserSettings.returns(KarmaUtils.mockPromise('boom'));
    service()
      .then(function() {
        done(new Error('Expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('boom');
        done();
      });
    $rootScope.$digest();
  });

  it('returns null when no configured contact', function(done) {
    UserSettings.returns(KarmaUtils.mockPromise(null, {}));
    service()
      .then(function(contact) {
        chai.expect(contact).to.equal(undefined);
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('returns error from getting contact', function(done) {
    UserSettings.returns(KarmaUtils.mockPromise(null, { contact_id: 'nobody' }));
    get.returns(KarmaUtils.mockPromise('boom'));
    service()
      .then(function() {
        done(new Error('Expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('boom');
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0]).to.equal('nobody');
        done();
      });
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('returns contact', function(done) {
    var expected = { _id: 'somebody', name: 'Some Body' };
    UserSettings.returns(KarmaUtils.mockPromise(null, { contact_id: 'somebody' }));
    get.returns(KarmaUtils.mockPromise(null, expected));
    service()
      .then(function(contact) {
        chai.expect(contact).to.deep.equal(expected);
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0]).to.equal('somebody');
        done();
      })
      .catch(done);
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

});