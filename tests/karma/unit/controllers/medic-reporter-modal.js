describe('MedicReporterModalCtrl', function() {
  'use strict';

  var createController,
      formCode,
      http,
      language,
      medicReporterUrl,
      scope,
      settings,
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

      $provide.factory('Location', function() {
        return { dbName: 'medic-karma' };
      });

      settings = sinon.stub();
      medicReporterUrl = '/url/to/medic-reporter/';
      $provide.factory('Settings', function() {
        return settings;
      });
    });

    inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      formCode = 'AAA';
      scope.model = { formCode: formCode };
      scope.setProcessing = sinon.stub();
      scope.setFinished = sinon.stub();
      scope.setError = sinon.stub();

      createController = function() {
        return $controller('MedicReporterModalCtrl', {
          '$scope': scope,
        });
      };
    });
  });

  afterEach(function() {
    KarmaUtils.restore(
      spyUibModalInstance, http.head, userContact, language, scope.setProcessing,
      scope.setFinished, scope.setError);
  });

  it('Sets loading mode while loading', function() {
    settings.returns(KarmaUtils.mockPromise(null, { muvuku_webapp_url: medicReporterUrl }));
    chai.expect(scope.setProcessing.called).to.equal(false);
    createController();
    chai.expect(scope.setProcessing.called).to.equal(true);
  });

  var runTest = function(done, reporterUrl, assertions) {
    settings.returns(KarmaUtils.mockPromise(null, { muvuku_webapp_url: reporterUrl }));
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
    var err = { status: 403 };
    http.head.returns(KarmaUtils.mockPromise(err));

    runTest(done, medicReporterUrl, function() {
      chai.expect(scope.setError.called).to.equal(true);
      chai.expect(scope.setError.getCall(0).args[0]).to.equal(err);
      chai.expect(scope.setError.getCall(0).args[1]).to.equal('error.403.description');
    });
  });

  it('Doesn\'t display medic-reporter if no medic-reporter url', function(done) {
    runTest(done, '', function() {
      chai.expect(scope.setError.called).to.equal(true);
      chai.expect(scope.setError.getCall(0).args[1]).to.equal('error.general.description');
    });
  });

  it('Adds trailing slash to medic-reporter url', function(done) {
    runTest(done, '/url/to/medic-reporter', function() {
      chai.expect(scope.setError.called).to.equal(false);
      chai.expect(scope.setFinished.called).to.equal(true);
      chai.assert(
        scope.medicReporterUrl.startsWith('/url/to/medic-reporter/'),
        'Should add trailing slash to url');
    });
  });

  it('Removes query params from medic-reporter url', function(done) {
    runTest(done, '/url/to/medic-reporter?a=b&c=d', function() {
      chai.expect(scope.setError.called).to.equal(false);
      chai.expect(scope.setFinished.called).to.equal(true);
      chai.assert(
        scope.medicReporterUrl.startsWith('/url/to/medic-reporter/'),
        'Should remove params from url');
    });
  });

  it('Displays medic-reporter if auth', function(done) {
    runTest(done, medicReporterUrl, function() {
      chai.expect(scope.setError.called).to.equal(false);
      chai.expect(scope.setFinished.called).to.equal(true);
      chai.assert(
        scope.medicReporterUrl.startsWith(medicReporterUrl),
        'Should put the right url for iframe');
    });
  });

  it('Displays appropriate form', function(done) {
    runTest(done, medicReporterUrl, function() {
      chai.assert(
        scope.medicReporterUrl.includes('_show_forms=' + formCode),
        'Should pass form code in url param');
    });
  });

  it('Uses the user\'s phone number if available', function(done) {
    runTest(done, medicReporterUrl, function() {
      chai.assert(
        scope.medicReporterUrl.includes('_gateway_num=' + userNumber),
        'Should pass phone in url param');
    });
  });

  it('Uses the user\'s locale if available', function(done) {
    runTest(done, medicReporterUrl, function() {
      chai.assert(
        scope.medicReporterUrl.includes('_locale=' + userLocale),
        'Should pass locale in url param');
    });
  });

  it('Dismisses modal on user cancel', function() {
    settings.returns(KarmaUtils.mockPromise(null, { muvuku_webapp_url: medicReporterUrl }));
    createController();
    scope.cancel();
    chai.assert(spyUibModalInstance.dismiss.called, 'Should dismiss modal on user cancel');
  });
});
