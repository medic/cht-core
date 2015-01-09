describe('Language service', function() {

  'use strict';

  var service,
      user,
      settings;

  beforeEach(function() {
    user = {};
    settings = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('User', function(callback) {
        callback(null, user);
      });
      $provide.value('Settings', function(callback) {
        callback(null, settings);
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
      done();
    });

  });

  it('uses the language configured in settings', function(done) {

    user = {};
    settings = { locale: 'yiddish' };

    service(function(err, actual) {
      chai.expect(actual).to.equal('yiddish');
      done();
    });

  });

  it('defaults', function(done) {

    user = {};
    settings = {};

    service(function(err, actual) {
      chai.expect(actual).to.equal('en');
      done();
    });

  });

});