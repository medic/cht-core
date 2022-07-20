describe.only('MultipleUserCtrl controller', () => {
  'use strict';

  let dbGet;
  let allDocs;
  let mockMultipleUserUpload;
  let uibModalInstance;
  let scope;
  let Settings;
  let CreateUser;

  beforeEach(() => {
    module('adminApp');

    dbGet = sinon.stub().resolves();
    allDocs = sinon.stub().resolves();
    Settings = sinon.stub().resolves();
    uibModalInstance = sinon.stub();
    CreateUser = {
      createMultipleUsers: sinon.stub().resolves()
    };

    module($provide => {
      $provide.factory(
        'DB',
        KarmaUtils.mockDB({
          get: dbGet,
          allDocs
        })
      );
      $provide.value('Settings', Settings);
      $provide.value('CreateUser', CreateUser);
    });

    inject(($rootScope, $controller) => {
      scope = $rootScope.$new();
      scope.uploadedData = {
        text: sinon.stub(),
      };
      const createController = () => {
        return $controller('MultipleUserCtrl', {
          $scope: scope,
          $rootScope: $rootScope,
          $q: Q,
          $uibModalInstance: uibModalInstance,
        }); 
      };
      mockMultipleUserUpload = () => {
        createController();
      };
    });
  });

  afterEach(() => {
    KarmaUtils.restore(
      dbGet,
      Settings,
      allDocs
    );
  });

  describe('targets edit', () => {
    it('$scope.processUpload sets othe $scope values correctly', () => {
      mockMultipleUserUpload();
      scope.clearScreen = sinon.stub();
      scope.uploadedData.text.resolves('text');
      allDocs.resolves([{
        _id: 'bulk-user-upload-1658319054181',
      }]);
      scope.processUpload();
      chai.expect(scope.clearScreen.callCount).to.equal(1);
      console.log(CreateUser.createMultipleUsers.callCount);
      console.log(allDocs.callCount);
    });
  });
});
