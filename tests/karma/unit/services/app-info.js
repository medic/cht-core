describe('AppInfo service', function() {

  'use strict';

  var service,
      settings,
      settingsError,
      $rootScope;

  beforeEach(function() {
    settings = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', function(callback) {
        callback(settingsError, settings);
      });
    });
    inject(function(_$rootScope_, _AppInfo_) {
      $rootScope = _$rootScope_;
      service = _AppInfo_;
    });
    settingsError = null;
  });

  it('returns errors', function(done) {
    settingsError = 'boom';
    service(function(err) {
      chai.expect(err).to.equal(settingsError);
      done();
    });
  });

  it('gets the form', function(done) {
    settings = {
      forms: {
        a: { id: 'a' },
        b: { id: 'b' }
      }
    };
    service(function(err, appinfo) {
      chai.expect(err).to.equal(null);
      var form = appinfo.getForm('a');
      chai.expect(form.id).to.equal('a');
      done();
    });
  });

  it('formats the date', function(done) {
    settings = {
      date_format: 'YYYY'
    };
    service(function(err, appinfo) {
      chai.expect(err).to.equal(null);
      var date = moment().add(1, 'years');
      var expected = date.format('YYYY') + ' (in a year)';
      var actual = appinfo.formatDate(date);
      chai.expect(actual).to.equal(expected);
      done();
    });
  });

  it('translates the key', function(done) {
    settings = {
      translations: [
        { 
          key: 'welcome', 
          translations: [{ locale: 'en', content: 'hi' }, { locale: 'en_NZ', content: 'kia ora' }]
        },
        { 
          key: 'bye', 
          translations: [{ locale: 'en', content: 'bye' }]
        }
      ]
    };
    service(function(err, appinfo) {
      chai.expect(err).to.equal(null);
      var actual = appinfo.translate('welcome', 'en_NZ');
      chai.expect(actual).to.equal('kia ora');
      done();
    });
  });

  it('translates the key to the default locale if none provided', function(done) {
    settings = {
      locale: 'en',
      translations: [
        { 
          key: 'welcome', 
          translations: [{ locale: 'en', content: 'hi' }, { locale: 'en_NZ', content: 'kia ora' }]
        },
        { 
          key: 'bye', 
          translations: [{ locale: 'en', content: 'bye' }]
        }
      ]
    };
    service(function(err, appinfo) {
      chai.expect(err).to.equal(null);
      var actual = appinfo.translate('welcome');
      chai.expect(actual).to.equal('hi');
      done();
    });
  });

});