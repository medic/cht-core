describe('UserLanguageModalCtrl controller', function() {
  'use strict';

  var createController, scope, stubSetLanguage, stubSettings, stubUpdateUser, spyUibModalInstance;

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
      stubSettings = sinon.stub();
      stubSettings.returns(KarmaUtils.mockPromise(
        {locales: [
          {code: 'en', name: 'English'},
          {code: 'sw', name: 'Swahili'},
          {code: 'aa', name: 'AAAAAA', disabled: true},
        ]}));
      $provide.factory('Settings', function() {
        return stubSettings;
      });
      $provide.factory('Session', function() {
        return { userCtx: function() { return {name: 'banana'}; } };
      });
      stubSetLanguage = sinon.stub();
      stubSetLanguage.returns(KarmaUtils.mockPromise());
      $provide.factory('SetLanguage', function() {
        return stubSetLanguage;
      });
      spyUibModalInstance = {close: sinon.spy(), dismiss: sinon.spy()};
      $provide.factory('$uibModalInstance', function() {
        return spyUibModalInstance;
      });
      stubUpdateUser = sinon.stub();
      stubUpdateUser.returns(KarmaUtils.mockPromise());
      $provide.factory('UpdateUser', function() {
        return stubUpdateUser;
      });
    });

    inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      createController = function() {
        return $controller('UserLanguageModalCtrl', {
          '$scope': scope,
        });
      };
    });

    createController();
  });

  it('displays the enabled languages', function() {
    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises
      chai.expect(scope.enabledLocales).to.equal([
            {code: 'en', name: 'English'},
            {code: 'sw', name: 'Swahili'}]);
      });
  });

  it('changes language on user selection', function() {
    var lang = 'aaaaaa';
    scope.changeLanguage(lang);
    chai.assert(stubSetLanguage.called, 'Should set new language');
    chai.expect(scope.selectedLanguage).to.equal(lang);
  });

  it('dismisses the modal on user cancel', function() {
    scope.cancel();
    chai.assert(spyUibModalInstance.dismiss.called, 'Should dismiss modal');
  });

  it('resets the language on user cancel', function() {
    scope.cancel();
    chai.assert(stubSetLanguage.called, 'Should reset language');
  });

  it('triggers saving on user submit', function() {
    var selectedLang = 'klingon';
    scope.changeLanguage(selectedLang);
    scope.ok();
    chai.assert(stubUpdateUser.called, 'Should call the processing function on user action');
    chai.expect(stubUpdateUser.getCall(0).args[1].language).to.equal(selectedLang);
  });

  it('displays the processing mode modal while saving', function(done) {
    chai.assert(!scope.processing, 'Should not be processing before user action');
    chai.assert(!scope.error, 'Should not be displaying error before user action');

    scope.ok();
    chai.assert(scope.processing, 'Should be displaying processing after user action');
    chai.assert(!scope.error, 'Should not be displaying error before processing');

    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises
      chai.assert(spyUibModalInstance.close.called, 'Should close modal when processing is done');
      // No testing of display : the modal is closed anyway.
      done();
    });
  });

  it('displays error when saving error', function(done) {
    stubUpdateUser.reset();
    stubUpdateUser.returns(KarmaUtils.mockPromise({err: 'oh noes language is all wrong'}));
    chai.assert(!scope.error, 'Should not be displaying error before user action');

    scope.ok();
    chai.assert(!scope.error, 'Should not be displaying error before processing');

    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises
      chai.assert(!spyUibModalInstance.close.called, 'Should not close modal when processing error');
      chai.assert(!spyUibModalInstance.dismiss.called, 'Should not dismiss modal when processing error');
      chai.assert(scope.error, 'Should be displaying error when processing error');
      chai.assert(!scope.processing, 'Should not be processing when processing is done');
      done();
    });
  });

  it('resets language when saving error', function(done) {
    stubUpdateUser.reset();
    stubUpdateUser.returns(KarmaUtils.mockPromise({err: 'oh noes language is all wrong'}));
    var initialLang = scope.selectedLanguage;
    scope.ok();
    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises
      chai.assert(stubSetLanguage.called, 'Should reset saved language');
      chai.expect(scope.selectedLanguage).to.equal(initialLang);
      done();
    });
  });
});
