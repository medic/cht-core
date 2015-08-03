describe('Language service', function() {

  'use strict';

  var service,
      user,
      settings,
      cookieVal,
      cookieCalledWith;

  beforeEach(function() {
    user = {};
    settings = {};
    cookieVal = null;
    cookieCalledWith = null;
    module('inboxApp');
    module(function ($provide) {
      $provide.value('UserSettings', function(callback) {
        callback(null, user);
      });
      $provide.value('Settings', function(callback) {
        callback(null, settings);
      });
      $provide.value('ipCookie', function() {
        if (arguments.length === 1) {
          return cookieVal;
        }
        cookieCalledWith = arguments;
        return null;
      });
    });
    inject(function(_Language_) {
      service = _Language_;
    });
  });

  it('uses the language configured in user', function(done) {

    user = { language: 'latin' };
    settings = {};

    service(function(err, actual) {
      chai.expect(actual).to.equal('latin');
      chai.expect(cookieCalledWith[0]).to.equal('locale');
      chai.expect(cookieCalledWith[1]).to.equal('latin');
      chai.expect(cookieCalledWith[2]).to.deep.equal({ expires: 365, path: '/' });
      done();
    });

  });

  it('uses the language configured in settings', function(done) {

    user = {};
    settings = { locale: 'yiddish' };

    service(function(err, actual) {
      chai.expect(actual).to.equal('yiddish');
      chai.expect(cookieCalledWith[0]).to.equal('locale');
      chai.expect(cookieCalledWith[1]).to.equal('yiddish');
      chai.expect(cookieCalledWith[2]).to.deep.equal({ expires: 365, path: '/' });
      done();
    });

  });

  it('defaults', function(done) {

    user = {};
    settings = {};

    service(function(err, actual) {
      chai.expect(cookieCalledWith[0]).to.equal('locale');
      chai.expect(cookieCalledWith[1]).to.equal('en');
      chai.expect(cookieCalledWith[2]).to.deep.equal({ expires: 365, path: '/' });
      chai.expect(actual).to.equal('en');
      done();
    });

  });

  it('uses cookie if set', function(done) {

    user = {};
    settings = {};
    cookieVal = 'ca';

    service(function(err, actual) {
      chai.expect(actual).to.equal('ca');
      chai.expect(cookieCalledWith).to.equal(null);
      done();
    });

  });

});