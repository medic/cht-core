describe('MedicReporterModalCtrl', function() {
  'use strict';

  var createController,
      formCode,
      http,
      language,
      scope,
      spyUibModalInstance,
      userContact,
      userLocale,
      userNumber;

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
      $provide.factory('$uibModalInstance', function() {
        spyUibModalInstance = {close: sinon.spy(), dismiss: sinon.spy()};
        return spyUibModalInstance;
      });

      $provide.factory('UserContact', function() {
        userNumber = 12345;
        userContact = sinon.stub();
        userContact.returns(KarmaUtils.mockPromise(null, {phone: userNumber}));
        return userContact;
      });

      $provide.factory('$http', function() {
        http = { head: sinon.stub() };
        http.head.returns(KarmaUtils.mockPromise(null, 'happy'));
        return http;
      });

      $provide.factory('Language', function() {
        userLocale = 'sw';
        language = sinon.stub();
        language.returns(KarmaUtils.mockPromise(null, userLocale));
        return language;
      });

      formCode = 'AAA';
      $provide.factory('formCode', function() {
        return formCode;
      });
    });

    inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      createController = function() {
        return $controller('MedicReporterModalCtrl', {
          '$scope': scope,
        });
      };
    });
  });

  afterEach(function() {
    KarmaUtils.restore(spyUibModalInstance, http.head, userContact, language);
  });

  it('Sets loading mode while loading', function() {
    chai.expect(scope.loading).to.equal(undefined);
    createController();
    chai.expect(scope.loading).to.equal(true);
  });

  var runTest = function(done, assertions) {
    createController();
    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises
      setTimeout(function() {
        scope.$apply(); // resolve the promises, second round.
        assertions();
        done();
      });
    });
  };

  it('Doesn\'t display medic-reporter if no auth', function(done) {
    http.head.returns(KarmaUtils.mockPromise({ status: 403 }));

    runTest(done, function() {
      chai.expect(scope.error).to.equal('error.403.description');
      chai.expect(scope.loading).to.equal(false);
    });
  });

  it('Displays medic-reporter if auth', function(done) {
    runTest(done, function() {
      chai.expect(scope.error).to.equal(undefined);
      chai.expect(scope.loading).to.equal(false);
      chai.assert(
        scope.medicReporterUrl.startsWith('/medic-reporter/_design/medic-reporter/_rewrite/?_embed_mode=1'),
        'Should put the right url for iframe');
    });
  });

  it('Uses the user\'s phone number if available', function(done) {
    runTest(done, function() {
      chai.assert(
        scope.medicReporterUrl.includes('_gateway_num=' + userNumber),
        'Should pass phone in url param');
    });
  });

  it('Uses the user\'s locale if available', function(done) {
    runTest(done, function() {
      chai.assert(
        scope.medicReporterUrl.includes('_locale=' + userLocale),
        'Should pass locale in url param');
    });
  });

  it('Dismisses modal on user cancel', function() {
    createController();
    scope.cancel();
    chai.assert(spyUibModalInstance.dismiss.called, 'Should dismiss modal on user cancel');
  });
});
