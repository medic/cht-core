describe('User devices export controller', () => {
  'use strict';
  
  const { expect } = chai;

  let scope;
  let getService;
  let Export;

  beforeEach(() => {
    module('adminApp');
    Export = sinon.stub().resolves();
    module($provide => {
      $provide.value('Export', Export);
      $provide.value('$scope', scope);
    });
    inject(($controller, _$rootScope_) => {
      scope = _$rootScope_.$new();
      getService = async () => {
        const result = $controller('ExportUserDevicesCtrl', {
          $scope: scope,
        });
        return result;
      };
    });
  });

  afterEach(() => sinon.restore());

  it('exports user-devices', async () => {
    sinon.spy(scope, '$apply');
    await getService();
    scope.export();
    expect(scope.exporting).to.be.true;
    expect(Export.returnValues.length).to.equal(1);
    await Export.returnValues[0];
    expect(scope.exporting).to.be.false;
    expect(Export.callCount).to.equal(1);
    expect(Export.args[0]).to.deep.equal(['user-devices', {}, {}]);
    expect(scope.$apply.callCount).to.equal(1);
  });

  it('doesn\'t trigger additional exports when an export is ongoing', async () => {
    expect(scope.exporting).to.be.undefined;
    await getService();
    scope.export();
    expect(scope.exporting).to.be.true;
    scope.export();
    scope.export();
    scope.export();
    expect(Export.returnValues.length).to.equal(1);
    await Export.returnValues[0];
    expect(scope.exporting).to.be.false;
  });
});
