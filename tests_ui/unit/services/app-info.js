describe('AppInfo service', function() {

  'use strict';

  var service,
      settings,
      $rootScope;

  beforeEach(function() {
    settings = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', {
        query: function(callback) {
          callback({ settings: settings });
        }
      });
    });
    inject(function(_$rootScope_, _AppInfo_) {
      $rootScope = _$rootScope_;
      service = _AppInfo_;
    });
  });

  it('gets the form', function(done) {

    settings = {
      forms: {
        a: { id: 'a' },
        b: { id: 'b' }
      }
    };

    service().then(function(appinfo) {
      var form = appinfo.getForm('a');
      chai.expect(form.id).to.equal('a');
      done();
    });

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('formats the date', function(done) {

    settings = {
      reported_date_format: 'YYYY'
    };

    service().then(function(appinfo) {
      var date = moment().add(1, 'years');
      var expected = date.format('YYYY') + ' (in a year)';
      var actual = appinfo.formatDate(date);
      chai.expect(actual).to.equal(expected);
      done();
    });

    // needed to resolve the promise
    $rootScope.$digest();
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

    service().then(function(appinfo) {
      var actual = appinfo.translate('welcome', 'en_NZ');
      chai.expect(actual).to.equal('kia ora');
      done();
    });

    // needed to resolve the promise
    $rootScope.$digest();
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

    service().then(function(appinfo) {
      var actual = appinfo.translate('welcome');
      chai.expect(actual).to.equal('hi');
      done();
    });

    // needed to resolve the promise
    $rootScope.$digest();
  });


});