describe('AppInfo service', function() {

  'use strict';

  var service,
      Settings,
      $rootScope;

  beforeEach(function() {
    Settings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', Settings);
    });
    inject(function(_$rootScope_, _AppInfo_) {
      $rootScope = _$rootScope_;
      service = _AppInfo_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Settings);
  });

  it('returns errors', function(done) {
    Settings.returns(KarmaUtils.mockPromise('boom'));
    service()
      .then(function() {
        done('SHOULD NOT GET HERE');
      })
      .catch(function(err) {
        chai.expect(err).to.equal('boom');
        done();
      });
    $rootScope.$digest();
  });

  it('gets the form', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, {
      forms: {
        a: { id: 'a' },
        b: { id: 'b' }
      }
    }));
    service()
      .then(function(appinfo) {
        var form = appinfo.getForm('a');
        chai.expect(form.id).to.equal('a');
        done();
      })
      .catch(function(err) {
        done(err);
      });
    $rootScope.$digest();
  });

  it('formats the date', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, {
      date_format: 'YYYY'
    }));
    service()
      .then(function(appinfo) {
        var date = moment().add(1, 'years');
        var expected = date.format('YYYY') + ' (in a year)';
        var actual = appinfo.formatDate(date);
        chai.expect(actual).to.equal(expected);
        done();
      })
      .catch(function(err) {
        done(err);
      });
    $rootScope.$digest();
  });

  it('translates the key', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, {
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
    }));
    service()
      .then(function(appinfo) {
        var actual = appinfo.translate('welcome', 'en_NZ');
        chai.expect(actual).to.equal('kia ora');
        done();
      })
      .catch(function(err) {
        done(err);
      });
    $rootScope.$digest();
  });

  it('translates the key to the default locale if none provided', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, {
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
    }));
    service()
      .then(function(appinfo) {
        var actual = appinfo.translate('welcome');
        chai.expect(actual).to.equal('hi');
        done();
      })
      .catch(function(err) {
        done(err);
      });
    $rootScope.$digest();
  });

});