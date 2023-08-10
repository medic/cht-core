const moment = require('moment');

angular.module('controllers').controller('BackupCtrl',
  function (
    $log,
    $scope,
    $timeout,
    Blob,
    FileReader,
    JsonParse,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    $scope.status = { uploading: false };

    const uploadFinished = function(err) {
      if (err) {
        $log.error('Upload failed', err);
      } else {
        $('#settings-upload').get(0).reset(); // clear the fields
      }
      // some events are triggered outside of angular so wrap in
      // $timeout so the UI is updated.
      $timeout(function() {
        $scope.status = {
          uploading: false,
          error: !!err,
          success: !err,
        };
      });
    };

    const upload = function() {
      $scope.status = {
        uploading: true,
        error: false,
        success: false,
      };
      const files = $('#settings-upload .uploader')[0].files;
      if (!files || files.length === 0) {
        uploadFinished(new Error('File not found'));
      }
      FileReader.utf8(files[0])
        .then(JsonParse)
        .then(function(settings) {
          return UpdateSettings(settings, { replace: true });
        })
        .then(function() {
          uploadFinished();
        })
        .catch(uploadFinished);
    };

    $('#settings-upload .uploader').on('change', upload);
    $('#settings-upload .choose').on('click', function(e) {
      e.preventDefault();
      $('#settings-upload .uploader').click();
    });

    Settings()
      .then(function(settings) {
        $scope.backup = {
          name: 'settings_' + moment().format('YYYY-MM-DD') + '.json',
          url: Blob.json(settings)
        };
      })
      .catch(function(err) {
        $log.error('Error fetching settings', err);
      });
  });
