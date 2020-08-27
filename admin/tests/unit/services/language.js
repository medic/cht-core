describe('Language service', function() {

  'use strict';

  let service;
  const UserSettings = sinon.stub();
  const Settings = sinon.stub();
  const ipCookie = sinon.stub();

  beforeEach(function() {
    module('adminApp');
    module(function($provide) {
      $provide.value('UserSettings', UserSettings);
      $provide.value('Settings', Settings);
      $provide.value('ipCookie', ipCookie);
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
    ipCookie.returns(null);
    UserSettings.returns(Promise.resolve({ language: 'latin' }));
    service().then(function(actual) {
      chai.expect(actual).to.equal('latin');
      chai.expect(UserSettings.callCount).to.equal(1);
      chai.expect(Settings.callCount).to.equal(0);
      chai.expect(ipCookie.callCount).to.equal(2);
      chai.expect(ipCookie.args[0][0]).to.equal('locale');
      chai.expect(ipCookie.args[1][0]).to.equal('locale');
      chai.expect(ipCookie.args[1][1]).to.equal('latin');
      chai.expect(ipCookie.args[1][2]).to.deep.equal({ expires: 365, path: '/' });
      done();
    }).catch(err => done(err));
  });

  it('uses the language configured in settings', function(done) {
    ipCookie.returns(null);
    UserSettings.returns(Promise.resolve({ }));
    Settings.returns(Promise.resolve({ locale: 'yiddish' }));
    service().then(function(actual) {
      chai.expect(actual).to.equal('yiddish');
      chai.expect(UserSettings.callCount).to.equal(1);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(ipCookie.callCount).to.equal(2);
      chai.expect(ipCookie.args[0][0]).to.equal('locale');
      chai.expect(ipCookie.args[1][0]).to.equal('locale');
      chai.expect(ipCookie.args[1][1]).to.equal('yiddish');
      chai.expect(ipCookie.args[1][2]).to.deep.equal({ expires: 365, path: '/' });
      done();
    }).catch(err => done(err));
  });

  it('defaults', function(done) {
    ipCookie.returns(null);
    UserSettings.returns(Promise.resolve({ }));
    Settings.returns(Promise.resolve({ }));
    service().then(function(actual) {
      chai.expect(actual).to.equal('en');
      chai.expect(UserSettings.callCount).to.equal(1);
      chai.expect(Settings.callCount).to.equal(1);
      chai.expect(ipCookie.callCount).to.equal(2);
      chai.expect(ipCookie.args[0][0]).to.equal('locale');
      chai.expect(ipCookie.args[1][0]).to.equal('locale');
      chai.expect(ipCookie.args[1][1]).to.equal('en');
      chai.expect(ipCookie.args[1][2]).to.deep.equal({ expires: 365, path: '/' });
      done();
    }).catch(err => done(err));
  });

  it('uses cookie if set', function(done) {
    ipCookie.returns('ca');
    service().then(function(actual) {
      chai.expect(UserSettings.callCount).to.equal(0);
      chai.expect(Settings.callCount).to.equal(0);
      chai.expect(ipCookie.callCount).to.equal(1);
      chai.expect(actual).to.equal('ca');
      done();
    }).catch(err => done(err));
  });

});
