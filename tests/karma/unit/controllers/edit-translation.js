describe('EditTranslationCtrl controller', function() {

  'use strict';

  var createController,
      rootScope,
      scope,
      translateFilter,
      Settings,
      UpdateSettings;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    rootScope = $rootScope;
    translateFilter = sinon.stub();
    Settings = sinon.stub();
    UpdateSettings = sinon.stub();
    createController = function() {
      return $controller('EditTranslationCtrl', {
        '$scope': scope,
        '$rootScope': $rootScope,
        'translateFilter': translateFilter,
        'Settings': Settings,
        'UpdateSettings': UpdateSettings
      });
    };
  }));

  it('init for translation', function() {
    createController();
    var translation = {
      key: 'title.key',
      default: 'Welcome',
      translations: [
        { locale: 'en', content: 'Welcome' },
        { locale: 'fr', content: 'Bonjour' },
      ]
    };
    var locales = [
      { code: 'en' },
      { code: 'fr' }
    ];
    rootScope.$broadcast('EditTranslationInit', translation, locales);
    chai.expect(scope.translationModel.key).to.equal('title.key');
    chai.expect(scope.translationModel.default).to.equal('Welcome');
    chai.expect(scope.translationModel.path).to.equal(undefined);
    chai.expect(scope.translationModel.values[0].locale.code).to.equal('en');
    chai.expect(scope.translationModel.values[0].value).to.equal('Welcome');
    chai.expect(scope.translationModel.values[1].locale.code).to.equal('fr');
    chai.expect(scope.translationModel.values[1].value).to.equal('Bonjour');
  });

  it('init for settings', function() {
    createController();
    var translation = {
      path: 'forms[0].registration',
      default: 'Welcome',
      translations: [
        { locale: 'en', content: 'Welcome' },
        { locale: 'fr', content: 'Bonjour' },
      ]
    };
    var locales = [
      { code: 'en' },
      { code: 'fr' }
    ];
    rootScope.$broadcast('EditTranslationInit', translation, locales);
    chai.expect(scope.translationModel.key).to.equal(undefined);
    chai.expect(scope.translationModel.default).to.equal('Welcome');
    chai.expect(scope.translationModel.path).to.equal('forms[0].registration');
    chai.expect(scope.translationModel.values[0].locale.code).to.equal('en');
    chai.expect(scope.translationModel.values[0].value).to.equal('Welcome');
    chai.expect(scope.translationModel.values[1].locale.code).to.equal('fr');
    chai.expect(scope.translationModel.values[1].value).to.equal('Bonjour');
  });

  it('save translation', function(done) {
    createController();
    var updated;
    rootScope.$on('TranslationUpdated', function(e, update) {
      updated = update;
    });
    scope.translationModel = {
      key: 'title.key',
      default: 'Welcome',
      values: [
        { locale: { code: 'en' }, value: 'Welcome' },
        { locale: { code: 'es' }, value: 'Hola' }
      ]
    };
    Settings.returns(KarmaUtils.mockPromise(null, {
      translations: [
        {
          key: 'title.key',
          translations: [
            { locale: 'en', content: 'Hello!' },
            { locale: 'fr', content: 'Bonjour' }
          ]
        }
      ]
    }));
    UpdateSettings.callsArgWith(1);
    scope.saveTranslation()
      .then(function() {
        chai.expect(updated.translations[0].key).to.equal('title.key');
        chai.expect(updated.translations[0].translations.length).to.equal(2);
        chai.expect(updated.translations[0].translations[0].locale).to.equal('en');
        chai.expect(updated.translations[0].translations[0].content).to.equal('Welcome');
        chai.expect(updated.translations[0].translations[1].locale).to.equal('es');
        chai.expect(updated.translations[0].translations[1].content).to.equal('Hola');
        done();
      })
      .catch(done);
    setTimeout(function() {
      rootScope.$digest();
    });
  });

  it('save settings', function(done) {
    createController();
    var updated;
    rootScope.$on('TranslationUpdated', function(e, update) {
      updated = update;
    });
    scope.translationModel = {
      path: 'forms[0].registration',
      default: 'Welcome',
      values: [
        { locale: { code: 'en' }, value: 'Welcome' },
        { locale: { code: 'es' }, value: 'Hola' }
      ]
    };
    Settings.returns(KarmaUtils.mockPromise(null, {
      forms: [
        {
          registration: {
            message: [
              { locale: 'en', content: 'Hello!' },
              { locale: 'fr', content: 'Bonjour' }
            ]
          }
        }
      ]
    }));
    UpdateSettings.callsArgWith(1);
    scope.saveTranslation()
      .then(function() {
        chai.expect(updated.forms[0].registration.message.length).to.equal(2);
        chai.expect(updated.forms[0].registration.message[0].locale).to.equal('en');
        chai.expect(updated.forms[0].registration.message[0].content).to.equal('Welcome');
        chai.expect(updated.forms[0].registration.message[1].locale).to.equal('es');
        chai.expect(updated.forms[0].registration.message[1].content).to.equal('Hola');
        done();
      })
      .catch(done);
    setTimeout(function() {
      rootScope.$digest();
    });
  });

});