describe('EditTranslationMessagesCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      uibModalInstance,
      Settings,
      UpdateSettings,
      model;

  beforeEach(module('inboxApp'));

  beforeEach(inject(function($rootScope, $controller) {
    scope = $rootScope.$new();
    uibModalInstance = sinon.stub();
    Settings = sinon.stub();
    UpdateSettings = sinon.stub();
    model = {};
    createController = function() {
      return $controller('EditTranslationMessagesCtrl', {
        '$scope': scope,
        '$uibModalInstance': uibModalInstance,
        'Settings': Settings,
        'UpdateSettings': UpdateSettings,
        'model': model
      });
    };
  }));

  it('render', function() {
    model = {
      translation: {
        path: 'forms[0].registration',
        translations: [
          { content: 'a', locale: 'en' },
          { content: 'b', locale: 'fr' },
          { content: 'c', locale: '' } // dropped due to falsey locale
        ]
      },
      locales: [
        { code: 'sw', name: 'Swahili' }, // added - missing from config
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'French' }
      ]
    };
    createController();
    chai.expect(scope.configuration).to.deep.equal({
      path: 'forms[0].registration',
      translations: [
        { content: 'a', locale: 'en' },
        { content: 'b', locale: 'fr' },
        { content: '', locale: 'sw' }
      ]
    });
  });

  it('submit', function() {
    model = {
      translation: {
        path: 'forms[0].registration',
        translations: [
          { content: 'Welcome', locale: 'en' },
          { content: 'Hola', locale: 'es' }
        ]
      },
      locales: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' }
      ]
    };
    createController();
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
    return scope.submit()
      .then(function() {
        var updated = UpdateSettings.args[0][0];
        chai.expect(updated.forms[0].registration.message.length).to.equal(2);
        chai.expect(updated.forms[0].registration.message[0].locale).to.equal('en');
        chai.expect(updated.forms[0].registration.message[0].content).to.equal('Welcome');
        chai.expect(updated.forms[0].registration.message[1].locale).to.equal('es');
        chai.expect(updated.forms[0].registration.message[1].content).to.equal('Hola');
      });
  });

});
