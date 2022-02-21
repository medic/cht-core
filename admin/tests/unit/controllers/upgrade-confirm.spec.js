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

    scope.submit();
    expect($uibModalInstance.close.callCount).to.equal(0);
    expect($uibModalInstance.dismiss.callCount).to.equal(0);
    expect(scope.model.confirmCallback.callCount).to.deep.equal(1);
    expect(scope.status).to.deep.equal({ processing: true });

    callbackResolve();
    await Promise.resolve();
    expect($uibModalInstance.close.callCount).to.equal(1);
    expect($uibModalInstance.dismiss.callCount).to.equal(0);
  });
});
