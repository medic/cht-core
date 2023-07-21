angular.module('controllers').controller('MultipleUserCtrl', function(
  $scope,
  $uibModalInstance,
  $window,
  CreateUser,
  DB
) {

  'use strict';
  'ngInject';

  $scope.status = { uploading: false };
  $scope.displayAddMultipleModal = true;
  $scope.displayUnavailableModal = false;
  $scope.displayUploadConfirm = false;
  $scope.displayProcessingStatus = false;
  $scope.displayFinishSummary = false;
  $scope.outputFileUrl = '';
  $scope.processTotal = '';
  const USER_LOG_DOC_ID = 'bulk-user-upload-';

  $scope.onCancel = function () {
    $scope.clearScreen();
    $uibModalInstance.dismiss();
  };

  const getLogsByType = (docPrefix) => {
    return DB({ logsDB: true })
      .allDocs({
        startkey: docPrefix,
        endkey: docPrefix + '\ufff0',
        include_docs: true
      })
      .then(result => {
        if (!result || !result.rows || !result.rows.length) {
          return;
        }
        return result.rows
          .map(row => row.doc)
          .sort((a, b) => new Date(b.bulk_uploaded_on) - new Date(a.bulk_uploaded_on));
      });
  };

  const prepareStringForCSV = (str) => {
    if (!str) {
      return str;
    }
    return '"' + str.replace(/"/g, '""') + '"';
  };

  const convertToCSV = doc => {
    if (!doc || !doc.data) {
      return;
    }
    const eol = '\r\n';
    const delimiter = ',';
    const columns = ['import.status:excluded', 'import.message:excluded', 'import.username:excluded'];
    let output = columns.join(delimiter) + eol;

    doc.data.forEach(record => {
      if (record.import) {
        output += [
          prepareStringForCSV(record.import.status),
          prepareStringForCSV(record.import.message),
          prepareStringForCSV(record.username),
        ].join(delimiter) + eol;
      }
    });

    const file = new Blob([output], { type: 'text/csv;charset=utf-8;' });
    return URL.createObjectURL(file);
  };

  $scope.processUpload = function () {
    $scope.clearScreen();
    $scope.displayProcessingStatus = true;
    return $scope.uploadedData
      .text()
      .then(data => CreateUser.createMultipleUsers(data))
      .then(() => getLogsByType(USER_LOG_DOC_ID))
      .then(docs => {
        if (!docs || !docs.length) {
          // eslint-disable-next-line no-console
          console.error('CreateMultipleUser : Error getting logs by type');
          $scope.setError('CreateMultipleUser : Error getting logs by type');
        } else {
          $scope.uploadProcessLog = docs[0];
          $scope.processTotal = $scope.uploadProcessLog.progress.parsing.total;
          $scope.successUsersNumber = $scope.uploadProcessLog.progress.saving.successful;
          $scope.ignoredUsersNumber = $scope.uploadProcessLog.progress.saving.ignored;
          $scope.failedUsersNumber = $scope.uploadProcessLog.progress.saving.failed;
          $scope.$apply();
          $scope.outputFileUrl = convertToCSV( $scope.uploadProcessLog);
          $scope.showFinishSummary();
        }
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.error(error, 'CreateMultipleUser : Error processing data after upload');
        $scope.setError(error, 'CreateMultipleUser : Error processing data after upload');
      });
  };

  $scope.showFinishSummary = function () {
    $scope.clearScreen();
    $scope.displayFinishSummary = true;
    $scope.$apply();
  };

  $scope.showDisplayUploadConfirm = function () {
    $scope.clearScreen();
    $scope.displayUploadConfirm = true;
    $scope.$apply();
  };

  $scope.backToAppManagement = function () {
    $window.location.href = '/admin/#/users';
    $window.location.reload();
    $scope.clearScreen();
    $uibModalInstance.dismiss();
    $scope.$apply();
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
    $('#users-upload .uploader').on('change', upload);
    $('#users-upload .choose').on('click', function(e) {
      e.preventDefault();
      $('#users-upload .uploader').click();
    });
  });
}
);
