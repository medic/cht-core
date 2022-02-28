describe('UpgradeConfirmCtrl controller', () => {
  'use strict';

  const expect = chai.expect;

  let $uibModalInstance;
  let scope;
  let createController;

  beforeEach(() => {
    module('adminApp');

    $uibModalInstance = {
      dismiss: sinon.stub(),
      close: sinon.stub(),
    };

    inject(($controller) => {
      createController = () => {
        scope = {};
        return $controller('UpgradeConfirmCtrl', {
          $scope: scope,
          $uibModalInstance: $uibModalInstance,
          $translate: sinon.stub().resolvesArg(0),
        });
      };
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should initialize empty status', async () => {
    await createController();

    expect(scope.status).to.deep.equal({});
    expect($uibModalInstance.close.callCount).to.equal(0);
    expect($uibModalInstance.dismiss.callCount).to.equal(0);
  });

  it('cancel should dismiss', async () => {
    await createController();

    scope.cancel();
    expect($uibModalInstance.close.callCount).to.equal(0);
    expect($uibModalInstance.dismiss.callCount).to.equal(1);
  });

  it('submit should call close if no callback', async () => {
    await createController();

    await scope.submit();
    expect($uibModalInstance.close.callCount).to.equal(1);
    expect($uibModalInstance.dismiss.callCount).to.equal(0);
    expect(scope.status).to.deep.equal({});
  });

  it('should call close after callback', async () => {
    await createController();

    let callbackResolve;

    scope.model = {
      confirmCallback: sinon.stub().callsFake(() => new Promise(r => callbackResolve = r)),
    };

    const submitPromise = scope.submit();
    expect($uibModalInstance.close.callCount).to.equal(0);
    expect($uibModalInstance.dismiss.callCount).to.equal(0);
    expect(scope.model.confirmCallback.callCount).to.deep.equal(1);
    expect(scope.status).to.deep.equal({ processing: true });

    callbackResolve();
    await submitPromise;

    expect($uibModalInstance.close.callCount).to.equal(1);
    expect($uibModalInstance.dismiss.callCount).to.equal(0);
  });

  it('should set an errored state if error is thrown', async () => {
    await createController();
    let callbackReject;

    scope.model = {
      confirmCallback: sinon.stub().callsFake(() => new Promise((res, rej) => callbackReject = rej)),
      errorKey: 'my_error_key',
    };

    const submitPromise = scope.submit();
    expect($uibModalInstance.close.callCount).to.equal(0);
    expect($uibModalInstance.dismiss.callCount).to.equal(0);
    expect(scope.model.confirmCallback.callCount).to.deep.equal(1);
    expect(scope.status).to.deep.equal({ processing: true });

    callbackReject();
    await submitPromise;

    expect($uibModalInstance.close.callCount).to.equal(0);
    expect($uibModalInstance.dismiss.callCount).to.equal(0);

    expect(scope.status).to.deep.equal({
      error: 'my_error_key',
      processing: false,
    });
  });
});
