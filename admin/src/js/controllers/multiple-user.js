angular.module('controllers').controller('MultipleUserCtrl', function(
  $scope,
  $uibModalInstance,
  CreateMultipleUser,
  DB
) {

  'use strict';
  'ngInject';

  // $scope.hideFooter = true;
  $scope.status = { uploading: false };
  $scope.displayAddMultipleModal = true;
  $scope.displayUnavailableModal = false;
  $scope.displayUploadConfirm = false;
  $scope.displayProcessingStatus = false;
  $scope.displayFinishSummary = false;
  const USER_LOG_DOC_ID = 'bulk-user-upload-';

  $scope.onCancel = function () {
    $scope.clearScreen();
    $uibModalInstance.dismiss();
  };


  const getLastUserLogDocId = function() {
    return getLogsByType(USER_LOG_DOC_ID);
  };

  const getLogsByType = (docPrefix) => {
    const options = {
      startkey: docPrefix,
      endkey: docPrefix + '\ufff0',
      include_docs: true
    };
    return DB({ logsDB: true })
      .allDocs(options)
      .then(result => {
        if (!result || !result.rows || !result.rows.length) {
          return;
        }
        const sortedDocs = result.rows
          .map(row => row.doc)
          .sort((a, b) => new Date(b.bulk_uploaded_on) - new Date(a.bulk_uploaded_on));
        // eslint-disable-next-line no-console
        console.warn('getLogsByType2', sortedDocs);
        return sortedDocs;
      });
  };
      
  $scope.processUpload = function () {
    $scope.uploadedData.text().then((data) => {
      // eslint-disable-next-line no-console
      console.log('uploaded data: '+ data);
      return CreateMultipleUser(data);
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.log('CreateMultipleUser : Error processing data after upload');
      $scope.setError(err, 'CreateMultipleUser : Error processing data after upload');
    }).then(() => {
      // eslint-disable-next-line no-console
      console.log('getLastUserLogDocId' + getLastUserLogDocId());
    }
    );
    $scope.clearScreen();
    $scope.displayProcessingStatus = true;
  };

  $scope.showFinishSummary = function () {
    $scope.clearScreen();
    $scope.displayFinishSummary = true;
  };

  $scope.showDisplayUploadConfirm = function () {
    $scope.clearScreen();
    $scope.displayUploadConfirm = true;
    $scope.$apply();
  };

  $scope.backToAppManagement = function () {
    $scope.clearScreen();
    $uibModalInstance.dismiss();
  };

  $scope.clearScreen = function () {
    $scope.displayAddMultipleModal = false;
    $scope.displayUnavailableModal = false;
    $scope.displayUploadConfirm = false;
    $scope.displayProcessingStatus = false;
    $scope.displayFinishSummary = false;
  };

  const upload = function() {
    const files = $('#users-upload .uploader')[0].files;
    if (!files || files.length === 0) {
      return;
    }
    $scope.usersFilename = files[0].name;
    $scope.uploadedData = files[0];
    $scope.showDisplayUploadConfirm();
  };

  angular.element(function () {
  /* $('.modal-dialog ').modal({
      backdrop: 'static',
      keyboard: false
    });*/
    $('#users-upload .uploader').on('change', upload);
    $('#users-upload .choose').on('click', function(e) {
      e.preventDefault();
      $('#users-upload .uploader').click();
    });
  });
}
);
