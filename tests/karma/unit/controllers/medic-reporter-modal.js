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
      mergedUri;

  beforeEach(function() {
    module('inboxApp');

    settingsUri = '';
    mergedUri = '';

    module(function($provide) {
      $provide.factory('$uibModalInstance', function() {
        spyUibModalInstance = {close: sinon.spy(), dismiss: sinon.spy()};
        return spyUibModalInstance;
      });

      $provide.factory('UserContact', function() {
        userNumber = 12345;
        userContact = sinon.stub();
        userContact.returns(Promise.resolve({phone: userNumber}));
        return userContact;
      });

      $provide.factory('$http', function() {
        http = { head: sinon.stub() };
        http.head.returns(Promise.resolve('happy'));
        return http;
      });

      $provide.factory('Language', function() {
        userLocale = 'sw';
        language = sinon.stub();
        language.returns(Promise.resolve(userLocale));
        return language;
      });

      $provide.factory('Settings', function() {
        settings = sinon.stub();
        settings.returns(Promise.resolve({ muvuku_webapp_url: settingsUri }));
        return settings;
      });

      $provide.factory('MergeUriParameters', function() {
        merge = sinon.stub();
        merge.returns(Promise.resolve(mergedUri));
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
    http.head.returns(Promise.reject(err));

    runTest(done, function() {
      chai.expect(scope.setError.called).to.equal(true);
      chai.expect(scope.setError.getCall(0).args[0]).to.equal(err);
      chai.expect(scope.setError.getCall(0).args[1]).to.equal('error.403.description');
    });
  });

  it('Displays medic-reporter if auth', function(done) {
    mergedUri = 'some-uri';
    runTest(done, function() {
      chai.expect(scope.setError.called).to.equal(false);
      chai.expect(scope.medicReporterUrl).to.equal(mergedUri);
      chai.expect(merge.callCount).to.equal(1);
      chai.expect(merge.args[0][0]).to.equal('/medic-reporter/_design/medic-reporter/_rewrite/');
    });
  });

  it('Adds trailing slash to auth url if needed', function(done) {
    settingsUri = '/report-sender';
    runTest(done, function() {
      chai.expect(http.head.called);
      chai.expect(http.head.args[0][0].substr(-3)).to.equal('%2F');
      chai.expect(merge.callCount).to.equal(1);
      chai.expect(merge.args[0][0]).to.equal('/report-sender/');
    });
  });

  it('Adds trailing slash to auth url if needed, and keeps url params', function(done) {
    settingsUri = '/report-sender?aaa=bbb';
    runTest(done, function() {
      chai.expect(http.head.called);
      chai.expect(http.head.args[0][0].substr(-3)).to.equal('%2F');
      chai.expect(merge.args[0][0]).to.equal('/report-sender/?aaa=bbb');
    });
  });

  it('Uses base url configured in settings', function(done) {
    settingsUri = '/report-sender';
    runTest(done, function() {
      chai.expect(scope.setError.called).to.equal(false);
      chai.expect(scope.medicReporterUrl).to.equal(mergedUri);
      chai.expect(merge.callCount).to.equal(1);
      chai.expect(merge.args[0][0]).to.equal('/report-sender/');
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

  it('Uses the current db\'s _forms_list_path', function(done) {
    runTest(done, function() {
      chai.expect(merge.args[0][1]._forms_list_path).to.equal('/api/v1/settings');
    });
  });

  it('Uses the current db\'s _sync_url', function(done) {
    runTest(done, function() {
      chai.expect(merge.args[0][1]._sync_url).to.equal('/api/sms');
    });
  });

  it('Dismisses modal on user cancel', function() {
    createController();
    scope.cancel();
    chai.assert(spyUibModalInstance.dismiss.called, 'Should dismiss modal on user cancel');
  });

});
