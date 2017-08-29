describe('UserContact service', function() {

  'use strict';

  var service,
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
    inject(function($injector) {
      service = $injector.get('UserContact');
    });
  });

  it('returns error from user settings', function(done) {
    UserSettings.returns(Promise.reject(new Error('boom')));
    service()
      .then(function() {
        done('Expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('boom');
        done();
      });
  });

  it('returns null when no configured contact', function() {
    UserSettings.returns(Promise.resolve({}));
    return service().then(function(contact) {
      chai.expect(contact).to.equal(undefined);
    });
  });

  it('returns null when configured contact not in the database', function() {
    UserSettings.returns(Promise.resolve({ contact_id: 'not-found' }));
    var err = new Error('not_found');
    err.reason = 'missing';
    err.message = 'missing';
    err.status = 404;
    get.returns(Promise.reject(err));
    return service().then(function(contact) {
      chai.expect(contact).to.equal(undefined);
    });
  });

  it('returns error from getting contact', function(done) {
    UserSettings.returns(Promise.resolve({ contact_id: 'nobody' }));
    get.returns(Promise.reject(new Error('boom')));
    service()
      .then(function() {
        done('Expected error to be thrown');
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('boom');
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0]).to.equal('nobody');
        done();
      });
  });

  it('returns contact', function() {
    var expected = { _id: 'somebody', name: 'Some Body' };
    UserSettings.returns(Promise.resolve({ contact_id: 'somebody' }));
    get.returns(Promise.resolve(expected));
    return service().then(function(contact) {
      chai.expect(contact).to.deep.equal(expected);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('somebody');
    });
  });

});
