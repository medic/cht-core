describe('AppInfo service', function() {

  'use strict';

  var service,
      Settings,
      $rootScope,
      $translate;

  beforeEach(function() {
    Settings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', Settings);
    });
    inject(function(_$rootScope_, _AppInfo_, _$translate_) {
      $rootScope = _$rootScope_;
      service = _AppInfo_;
      $translate = _$translate_;
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
    var expected = 'kia ora';
    Settings.returns(KarmaUtils.mockPromise(null, {}));
    var translate = sinon.stub($translate, 'instant').returns(expected);
    service()
      .then(function(appinfo) {
        var actual = appinfo.translate('welcome', 'en_NZ');
        chai.expect(actual).to.equal(expected);
        chai.expect(translate.callCount).to.equal(1);
        chai.expect(translate.args[0][0]).to.equal('welcome');
        done();
      })
      .catch(function(err) {
        done(err);
      });
    $rootScope.$digest();
  });

});
