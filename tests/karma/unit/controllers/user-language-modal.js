describe('UserLanguageModalCtrl controller', function() {
  'use strict';

  var createController,
      scope,
      dbQuery,
      stubSetLanguage,
      stubLanguage,
      stubUpdateUser,
      spyUibModalInstance;


  beforeEach(module('inboxApp'));

  beforeEach(inject(function(_$rootScope_, $controller) {
    scope = _$rootScope_.$new();
    scope.setProcessing = sinon.stub();
    scope.setFinished = sinon.stub();
    scope.setError = sinon.stub();
    dbQuery = sinon.stub();
    dbQuery.returns(KarmaUtils.mockPromise(
      { rows: [
        { value: { code: 'en', name: 'English' } },
        { value: { code: 'sw', name: 'Swahili' } }
      ] }
    ));
    stubSetLanguage = sinon.stub();
    stubSetLanguage.returns(KarmaUtils.mockPromise());
    stubLanguage = sinon.stub();
    stubLanguage.returns(KarmaUtils.mockPromise(null, 'ab'));
    spyUibModalInstance = {close: sinon.spy(), dismiss: sinon.spy()};
    stubUpdateUser = sinon.stub();
    stubUpdateUser.returns(KarmaUtils.mockPromise());

    createController = function() {
      return $controller('UserLanguageModalCtrl', {
        '$scope': scope,
        'DB': KarmaUtils.mockDB({ query: dbQuery })(),
        'Session': { userCtx: function() {
          return { name: 'banana' };
        } },
        'SetLanguage': stubSetLanguage,
        '$uibModalInstance': spyUibModalInstance,
        'UpdateUser': stubUpdateUser,
        'Language': stubLanguage
      });
    };
  }));

  afterEach(function() {
    KarmaUtils.restore(dbQuery, stubSetLanguage, stubLanguage, stubUpdateUser, spyUibModalInstance);
  });

  it('changes language on user selection', function() {
    createController();
    var lang = 'aaaaaa';
    scope.changeLanguage(lang);
    chai.assert(stubSetLanguage.called, 'Should set new language');
    chai.expect(scope.selectedLanguage).to.equal(lang);
  });

  it('dismisses the modal on user cancel', function() {
    createController();
    scope.cancel();
    chai.assert(spyUibModalInstance.dismiss.called, 'Should dismiss modal');
  });

  it('resets the language on user cancel', function(done) {
    createController();
    setTimeout(function() {
      scope.cancel();
      chai.assert(stubSetLanguage.called, 'Should reset language');
      done();
    });
  });

  it('triggers saving on user submit', function() {
    createController();
    var selectedLang = 'klingon';
    scope.changeLanguage(selectedLang);
    scope.submit();
    chai.assert(stubUpdateUser.called, 'Should call the processing function on user action');
    chai.expect(stubUpdateUser.getCall(0).args[1].language).to.equal(selectedLang);
  });

  it('displays the processing mode modal while saving', function(done) {
    createController();

    setTimeout(function() {
      scope.submit();
      chai.assert(scope.setProcessing.called);

      setTimeout(function() {
        scope.$apply(); // needed to resolve the promises
        chai.assert(scope.setFinished.called);
        chai.assert(!scope.setError.called);
        chai.assert(spyUibModalInstance.close.called, 'Should close modal when processing is done');
        // No testing of display : the modal is closed anyway.
        done();
      });
    });
  });

  it('displays error when saving error', function(done) {
    createController();
    stubUpdateUser.reset();
    stubUpdateUser.returns(KarmaUtils.mockPromise({err: 'oh noes language is all wrong'}));

    setTimeout(function() {
      scope.submit();

      setTimeout(function() {
        scope.$apply(); // needed to resolve the promises
        chai.assert(!spyUibModalInstance.close.called, 'Should not close modal when processing error');
        chai.assert(!spyUibModalInstance.dismiss.called, 'Should not dismiss modal when processing error');
        chai.assert(!scope.setFinished.called);
        chai.assert(scope.setError.called);
        done();
      });
    });
  });

  it('resets language when saving error', function(done) {
    createController();
    stubUpdateUser.reset();
    stubUpdateUser.returns(KarmaUtils.mockPromise({err: 'oh noes language is all wrong'}));
    setTimeout(function() {
      var initialLang = scope.selectedLanguage;
      scope.submit();
      setTimeout(function() {
        scope.$apply(); // needed to resolve the promises
        chai.assert(stubSetLanguage.called, 'Should reset saved language');
        chai.expect(scope.selectedLanguage).to.equal(initialLang);
        done();
      });
    });
  });
});
