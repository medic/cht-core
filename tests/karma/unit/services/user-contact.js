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
    UserSettings.callsArgWith(0, 'boom');
    service(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('returns null when no configured contact', function(done) {
    UserSettings.callsArgWith(0, null, {});
    service(function(err, contact) {
      chai.expect(err).to.equal(undefined);
      chai.expect(contact).to.equal(undefined);
      done();
    });
  });

  it('returns error from getting contact', function(done) {
    UserSettings.callsArgWith(0, null, { contact_id: 'nobody' });
    get.returns(KarmaUtils.mockPromise('boom'));
    service(function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('nobody');
      done();
    });
  });

  it('returns contact', function(done) {
    var expected = { _id: 'somebody', name: 'Some Body' };
    UserSettings.callsArgWith(0, null, { contact_id: 'somebody' });
    get.returns(KarmaUtils.mockPromise(null, expected));
    service(function(err, contact) {
      chai.expect(err).to.equal(null);
      chai.expect(contact).to.deep.equal(expected);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('somebody');
      done();
    });
  });

});