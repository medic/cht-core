describe('Modal service', function() {

  'use strict';

  var service,
      uibModalOpen;

  beforeEach(function() {
    module('inboxApp');
    uibModalOpen = sinon.stub();
    module(function ($provide) {
      $provide.factory('$uibModal', function() {
        return { open: uibModalOpen };
      });
    });
    inject(function(_Modal_) {
      service = _Modal_;
    });
  });

  it('passed args to uibModal', function() {
    var options = {
      templateUrl: 'url',
      controller: 'controller',
      model: 123
    };
    uibModalOpen.returns({ result: 'result' });
    service(options);

    chai.expect(uibModalOpen.called).to.equal(true);
    var actual = uibModalOpen.getCall(0).args[0];
    chai.expect(actual.templateUrl).to.equal(options.templateUrl);
    chai.expect(actual.controller).to.equal(options.controller);
    chai.expect(actual.scope.model).to.equal(123);
  });

  it('closes previous modal if singleton is set', function() {
    var options = {
      templateUrl: 'url',
      controller: 'controller',
      singleton: true
    };
    var firstModal = { close: sinon.stub() };
    var secondModal = { close: sinon.stub() };
    uibModalOpen.onCall(0).returns(firstModal);
    uibModalOpen.onCall(1).returns(secondModal);

    // first call
    service(options);
    chai.expect(uibModalOpen.callCount).to.equal(1);

    // second call
    service(options);
    chai.expect(firstModal.close.callCount).to.equal(1);
    chai.expect(secondModal.close.callCount).to.equal(0);
    chai.expect(uibModalOpen.callCount).to.equal(2);
  });
});