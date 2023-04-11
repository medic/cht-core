describe('Modal service', () => {

  'use strict';

  let service;
  let uibModalOpen;

  beforeEach(() => {
    module('adminApp');
    uibModalOpen = sinon.stub();
    module($provide => {
      $provide.factory('$uibModal', () => {
        return { open: uibModalOpen };
      });
    });
    inject(_Modal_ => {
      service = _Modal_;
    });
  });

  it('passed args to uibModal', () => {
    const options = {
      templateUrl: 'url',
      controller: 'controller',
      model: 123
    };
    uibModalOpen.returns({
      result: 'result',
      closed: { then: sinon.stub() }
    });
    service(options);

    chai.expect(uibModalOpen.called).to.equal(true);
    const actual = uibModalOpen.getCall(0).args[0];
    chai.expect(actual.templateUrl).to.equal(options.templateUrl);
    chai.expect(actual.controller).to.equal(options.controller);
    chai.expect(actual.scope.model).to.equal(123);
  });

  it('second identical modal does not open', () => {
    const options = {
      templateUrl: 'url',
      controller: 'controller',
    };
    uibModalOpen.onCall(0).returns({
      result: 'result',
      closed: { then: sinon.stub() }
    });

    // first call
    service(options);
    chai.expect(uibModalOpen.callCount).to.equal(1);

    // second call
    service(options);
    chai.expect(uibModalOpen.callCount).to.equal(1);
  });

  it('different modal does open', () => {
    const options1 = {
      templateUrl: 'url1',
      controller: 'controller',
    };
    const options2 = {
      templateUrl: 'url2',
      controller: 'controller',
    };
    const result1 = {
      result: 'result1',
      close: sinon.stub(),
      closed: { then: sinon.stub() }
    };
    const result2 = {
      result: 'result2',
      close: sinon.stub(),
      closed: { then: sinon.stub() }
    };
    uibModalOpen.onCall(0).returns(result1);
    uibModalOpen.onCall(1).returns(result2);

    // first call
    service(options1);
    chai.expect(uibModalOpen.callCount).to.equal(1);

    // second call
    service(options2);
    chai.expect(uibModalOpen.callCount).to.equal(2);

    chai.expect(result1.close.callCount).to.equal(0);
    chai.expect(result2.close.callCount).to.equal(0);
  });

  it('second identical modal opens if first modal is closed first', () => {
    const options = {
      templateUrl: 'url',
      controller: 'controller',
    };
    let closeCallback;
    const result1 = {
      result: 'result1',
      close: sinon.stub(),
      closed: { then: cb => (closeCallback = cb) }
    };
    const result2 = {
      result: 'result2',
      close: sinon.stub(),
      closed: { then: sinon.stub() }
    };
    uibModalOpen.onCall(0).returns(result1);
    uibModalOpen.onCall(1).returns(result2);

    // first call
    service(options);

    // fire the close callback
    closeCallback();

    // second call
    service(options);
    chai.expect(result1.close.callCount).to.equal(0);
    chai.expect(result2.close.callCount).to.equal(0);
    chai.expect(uibModalOpen.callCount).to.equal(2);
  });

});
