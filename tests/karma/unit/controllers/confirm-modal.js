describe('ConfirmModalCtrl controller', function() {
  'use strict';

  var createController,
      processingFunction,
      model,
      scope,
      spyUibModalInstance;

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
      $provide.factory('$uibModalInstance', function() {
        spyUibModalInstance = {close: sinon.spy(), dismiss: sinon.spy()};
        return spyUibModalInstance;
      });
      model = {};
      processingFunction = sinon.stub();
      processingFunction.returns(KarmaUtils.mockPromise());
      $provide.factory('processingFunction', function() {
        return processingFunction;
      });
      $provide.factory('model', function() {
        return model;
      });
    });

    inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      createController = function() {
        return $controller('ConfirmModalCtrl', {
          '$scope': scope,
        });
      };
    });

    createController();
  });

  describe('without processing function', function() {
    it('dismisses the modal on user cancel', function() {
      scope.cancel();
      chai.assert(spyUibModalInstance.dismiss.called, 'Should dismiss modal');
    });

    it('closes the modal on user ok', function() {
      scope.ok();
      chai.assert(spyUibModalInstance.close.called, 'Should close modal');
    });
  });

  describe('with processing function returning synchronously', function() {
    it('does processing then closes modal', function() {
      processingFunction.reset();
      processingFunction.returns(true);

      chai.assert(!scope.processing, 'Should not be processing before user action');
      chai.assert(!scope.error, 'Should not be displaying error before user action');

      scope.setProcessingMode();
      chai.assert(processingFunction.called, 'Should call the processing function on user action');
      chai.assert(spyUibModalInstance.close.called, 'Should close modal when processing is done');
    });

    it('does failed processing then doesn\'t close modal', function() {
      processingFunction.reset();
      processingFunction.returns(false);

      chai.assert(!scope.processing, 'Should not be processing before user action');
      chai.assert(!scope.error, 'Should not be displaying error before user action');

      scope.setProcessingMode();
      chai.assert(processingFunction.called, 'Should call the processing function on user action');
      chai.assert(!spyUibModalInstance.close.called, 'Should not close modal when failed processing is done');
      chai.assert(scope.error, 'Should be displaying error when processing error');
      chai.assert(!scope.processing, 'Should not be processing when processing is done');
    });
  });

  describe('with processing function returning a promise', function() {
    it('displays the processing mode modal on user action', function(done) {
      chai.assert(!scope.processing, 'Should not be processing before user action');
      chai.assert(!scope.error, 'Should not be displaying error before user action');

      scope.setProcessingMode();
      chai.assert(scope.processing, 'Should be displaying processing after user action');
      chai.assert(!scope.error, 'Should not be displaying error before processing');
      chai.assert(processingFunction.called, 'Should call the processing function on user action');

      setTimeout(function() {
        scope.$apply(); // needed to resolve the promises
        chai.assert(spyUibModalInstance.close.called, 'Should close modal when processing is done');
        // No testing of display : the modal is closed anyway.
        done();
      });
    });

    it('displays error when processing error', function(done) {
      processingFunction.reset();
      processingFunction.returns(KarmaUtils.mockPromise({err: 'oh noes processing messed up'}));
      chai.assert(!scope.error, 'Should not be displaying error before user action');

      scope.setProcessingMode();
      chai.assert(!scope.error, 'Should not be displaying error before processing');
      chai.assert(processingFunction.called, 'Should call the processing function on user action');

      setTimeout(function() {
        scope.$apply(); // needed to resolve the promises
        chai.assert(!spyUibModalInstance.close.called, 'Should not close modal when processing error');
        chai.assert(!spyUibModalInstance.dismiss.called, 'Should not dismiss modal when processing error');
        chai.assert(scope.error, 'Should be displaying error when processing error');
        chai.assert(!scope.processing, 'Should not be processing when processing is done');
        done();
      });
    });
  });
});