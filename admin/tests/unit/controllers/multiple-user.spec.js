describe('MultipleUserCtrl controller', () => {
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
    uibModalInstance = {
      dismiss: sinon.stub(),
      rendered: { then: sinon.stub() }
    };
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
      scope.setError = sinon.stub();
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
    sinon.restore();
  });

  describe('$scope functions', () => {
    it('$scope.processUpload sets the $scope values correctly', async () => {
      const logDoc = {
        _id: 'bulk-user-upload-1656964534839',
        bulk_uploaded_on: '2022-07-04T19:55:34.839Z',
        bulk_uploaded_by: 'admin',
        data: [
          {
            import: {
              'status': 'error',
              'message': 'Failed to find place.'
            },
            contact: {
              username: 'testuser',
              first_name: 'test',
              last_name: 'user',
              sex: 'male',
              phone: '12345678',
              meta: {
                created_by: ''
              },
              role: 'chw',
              geolocalized: 'false',
              type: 'contact',
              ontact_type: 'c62_chw',
              name: 'test user'
            },
            email: 'test@testing.com',
            token_login: '',
            username: 'testuser',
            phone: '12345678',
            place: '00a8188b-f7ed-5bed-9b09-6040ad3eeecb',
            type: 'chw',
            fullname: 'test user'
          }
        ],
        progress: {
          status: 'finished',
          parsing: {
            total: 1,
            failed: 0,
            successful: 1
          },
          saving: {
            total: 1,
            failed: 1,
            successful: 0,
            ignored: 0
          },
        }
      };
      mockMultipleUserUpload();
      scope.clearScreen = sinon.stub();
      scope.showFinishSummary = sinon.stub();
      scope.uploadedData.text.resolves('text');
      allDocs.resolves({
        rows: [{
          doc: logDoc
        }]
      });
      await scope.processUpload();

      chai.expect(scope.uploadProcessLog).to.deep.equal(logDoc);
      chai.expect(scope.processTotal).to.equal(1);
      chai.expect(scope.ignoredUsersNumber).to.equal(0);
      chai.expect(scope.failedUsersNumber).to.equal(1);
      chai.expect(scope.clearScreen.callCount).to.equal(1);
      chai.expect(scope.showFinishSummary.callCount).to.equal(1);
    });

    it('$scope.processUpload catches errors', async () => {
      mockMultipleUserUpload();
      scope.uploadedData.text.resolves('text');
      scope.setError = sinon.stub();
      allDocs.rejects({
        error: 'some error'
      });
      await scope.processUpload();

      chai.expect(scope.setError.callCount).to.equal(1);
      chai.expect(scope.setError.args[0][0].error).to.equal('some error');
    });

    it('$scope.noCancel call clearScreen and closes the modal', async () => {
      mockMultipleUserUpload();
      scope.clearScreen = sinon.stub();
      await scope.onCancel();

      chai.expect(scope.clearScreen.callCount).to.equal(1);
      chai.expect(uibModalInstance.dismiss.callCount).to.equal(1);
    });

    it('$scope.showFinishSummary sets the correct variables', async () => {
      mockMultipleUserUpload();
      scope.clearScreen = sinon.stub();
      scope.$apply = sinon.stub();
      await scope.showFinishSummary();

      chai.expect(scope.clearScreen.callCount).to.equal(1);
      chai.expect(scope.$apply.callCount).to.equal(1);
      chai.expect(scope.displayFinishSummary).to.equal(true);
    });

    it('$scope.showDisplayUploadConfirm sets the correct variables', async () => {
      mockMultipleUserUpload();
      scope.clearScreen = sinon.stub();
      scope.$apply = sinon.stub();
      await scope.showDisplayUploadConfirm();

      chai.expect(scope.clearScreen.callCount).to.equal(1);
      chai.expect(scope.$apply.callCount).to.equal(1);
      chai.expect(scope.displayUploadConfirm).to.equal(true);
    });
  });
});
