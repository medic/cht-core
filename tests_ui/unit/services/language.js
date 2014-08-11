describe('Language service', function() {

  'use strict';

  var service,
      user,
      settings,
      $rootScope;

  beforeEach(function() {
    user = {};
    settings = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('User', {
        query: function(callback) {
          callback(user);
        }
      });
      $provide.value('Settings', {
        query: function(callback) {
          callback({ settings: settings });
        }
      });
    });
    inject(function(_Language_, _$rootScope_) {
      $rootScope = _$rootScope_;
      service = _Language_;
    });
  });

  it('uses the language configured in user', function(done) {

    user = { language: 'latin' };
    settings = {};

    service().then(function(actual) {
      chai.expect(actual).to.equal('latin');
      done();
    });

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('uses the language configured in settings', function(done) {

    user = {};
    settings = { locale: 'yiddish' };

    service().then(function(actual) {
      chai.expect(actual).to.equal('yiddish');
      done();
    });

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('defaults', function(done) {

    user = {};
    settings = {};

    service().then(function(actual) {
      chai.expect(actual).to.equal('en');
      done();
    });

    // needed to resolve the promise
    $rootScope.$digest();
  });

});