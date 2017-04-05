describe('Language service', function() {

  'use strict';

  var service,
      UserSettings = sinon.stub(),
      Settings = sinon.stub(),
      ipCookie = sinon.stub();

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('UserSettings', UserSettings);
      $provide.value('Settings', Settings);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_Language_) {
      service = _Language_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(UserSettings, Settings, ipCookie);
  });

  it('uses the language configured in user', function(done) {
    UserSettings.returns(KarmaUtils.mockPromise(null, { language: 'latin' }));
    service().then(function(actual) {
      chai.expect(actual).to.equal('latin');
      chai.expect(UserSettings.callCount).to.equal(1);
      chai.expect(Settings.callCount).to.equal(0);
      done();
    });
  });

  it('uses the language configured in settings', function(done) {
    UserSettings.returns(KarmaUtils.mockPromise(null, { }));
    Settings.returns(KarmaUtils.mockPromise(null, { locale: 'yiddish' }));
    service().then(function(actual) {
      chai.expect(actual).to.equal('yiddish');
      chai.expect(UserSettings.callCount).to.equal(1);
      chai.expect(Settings.callCount).to.equal(1);
      done();
    });
  });

  it('defaults', function(done) {
    UserSettings.returns(KarmaUtils.mockPromise(null, { }));
    Settings.returns(KarmaUtils.mockPromise(null, { }));
    service().then(function(actual) {
      chai.expect(actual).to.equal('en');
      chai.expect(UserSettings.callCount).to.equal(1);
      chai.expect(Settings.callCount).to.equal(1);
      done();
    });
  });
});
