var moment = require('moment'),
    _ = require('underscore');

angular.module('controllers').controller('FormsJsonCtrl',
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

    var generateDownload = function(forms) {
      return {
        name: 'forms_' + moment().format('YYYY-MM-DD') + '.json',
        url: Blob.json(_.values(forms))
      };
    };

    $scope.status = { uploading: false };

    var uploadFinished = function(err) {
      if (err) {
        $log.error('Upload failed', err);
      } else {
        $('#forms-upload-json').get(0).reset(); // clear the fields
        loadForms();
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

    var upload = function() {
      $scope.status = {
        uploading: true,
        error: false,
        success: false,
      };
      var files = $('#forms-upload-json .uploader')[0].files;
      if (!files || files.length === 0) {
        uploadFinished(new Error('File not found'));
      }
      var settings = { forms: {} };
      FileReader.utf8(files[0])
        .then(JsonParse)
        .then(function(json) {
          json.forEach(function(form) {
            if (form.meta && form.meta.code) {
              settings.forms[form.meta.code.toUpperCase()] = form;
            }
          });
        })
        .then(function() {
          return UpdateSettings(settings, { replace: true });
        })
        .then(function() {
          $scope.forms = settings.forms;
          uploadFinished();
        })
        .catch(uploadFinished);
    };

    $('#forms-upload-json .uploader').on('change', upload);
    $('#forms-upload-json .choose').on('click', function(e) {
      e.preventDefault();
      $('#forms-upload-json .uploader').click();
    });

    var loadForms = function() {
      Settings()
        .then(function(settings) {
          $scope.forms = settings.forms;
          $scope.download = generateDownload(settings.forms);
        })
        .catch(function(err) {
          $log.error('Error fetching settings', err);
        });
    };

    loadForms();

  }
);
