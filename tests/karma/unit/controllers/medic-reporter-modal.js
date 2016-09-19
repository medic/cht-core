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
      userNumber,
      settings,
      settingsUri,
      merge,
      mergeUri;

  beforeEach(function() {
    module('inboxApp');

    settingsUri = '';
    mergeUri = '';

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

      $provide.factory('Settings', function() {
        settings = sinon.stub();
        settings.returns(KarmaUtils.mockPromise(null, { muvuku_webapp_url: settingsUri }));
        return settings;
      });

      $provide.factory('MergeUriParameters', function() {
        merge = sinon.stub();
        merge.returns(KarmaUtils.mockPromise(null, mergeUri));
        return merge;
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
      spyUibModalInstance, http.head, userContact, language, settings, 
      scope.setProcessing, scope.setFinished, scope.setError
    );
  });

  var runTest = function(done, assertions) {
    createController();
    setTimeout(function() {
      scope.$apply(); // needed to resolve the promises
      setTimeout(function() {
        scope.$apply(); // resolve the promises, second round.
        setTimeout(function() {
          scope.$apply(); // resolve the promises, third round.
          assertions();
          done();
        });
      });
    });
  };

  it('Does not display medic-reporter if no auth', function(done) {
    var err = { status: 403 };
    http.head.returns(KarmaUtils.mockPromise(err));

    runTest(done, function() {
      chai.expect(scope.setError.called).to.equal(true);
      chai.expect(scope.setError.getCall(0).args[0]).to.equal(err);
      chai.expect(scope.setError.getCall(0).args[1]).to.equal('error.403.description');
    });
  });

  it('Displays medic-reporter if auth', function(done) {
    mergeUri = 'some-uri';
    runTest(done, function() {
      chai.expect(scope.setError.called).to.equal(false);
      chai.expect(scope.medicReporterUrl).to.equal(mergeUri);
      chai.expect(merge.callCount).to.equal(1);
      chai.expect(merge.args[0][0]).to.equal('/medic-reporter/_design/medic-reporter/_rewrite/');
    });
  });

  it('Uses base url configured in settings', function(done) {
    settingsUri = '/report-sender';
    runTest(done, function() {
      chai.expect(scope.setError.called).to.equal(false);
      chai.expect(scope.medicReporterUrl).to.equal(mergeUri);
      chai.expect(merge.callCount).to.equal(1);
      chai.expect(merge.args[0][0]).to.equal('/report-sender');
    });
  });

  it('Displays appropriate form', function(done) {
    runTest(done, function() {
      chai.expect(merge.args[0][1]._show_forms).to.equal(formCode);
    });
  });

  it('Uses the user\'s phone number if available', function(done) {
    runTest(done, function() {
      chai.expect(merge.args[0][1]._gateway_num).to.equal(userNumber);
    });
  });

  it('Uses the user\'s locale if available', function(done) {
    runTest(done, function() {
      chai.expect(merge.args[0][1]._locale).to.equal(userLocale);
    });
  });

  it('Dismisses modal on user cancel', function() {
    createController();
    scope.cancel();
    chai.assert(spyUibModalInstance.dismiss.called, 'Should dismiss modal on user cancel');
  });

});
