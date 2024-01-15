const moment = require('moment');
const _ = require('lodash/core');

angular.module('controllers').controller('SmsFormsCtrl',
  function(
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

    const generateDownload = forms => {
      return {
        name: 'forms_' + moment().format('YYYY-MM-DD') + '.json',
        url: Blob.json(_.values(forms))
      };
    };

    $scope.status = { uploading: false };

    const uploadFinished = err => {
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

    const upload = () => {
      $scope.status = {
        uploading: true,
        error: false,
        success: false,
      };
      const files = $('#forms-upload-json .uploader')[0].files;
      if (!files || files.length === 0) {
        uploadFinished(new Error('File not found'));
      }
      const settings = { forms: {} };
      FileReader.utf8(files[0])
        .then(JsonParse)
        .then(json => {
          json.forEach(form => {
            if (form.meta && form.meta.code) {
              settings.forms[form.meta.code.toUpperCase()] = form;
            }
          });
        })
        .then(() => UpdateSettings(settings, { replace: true }))
        .then(() => {
          $scope.forms = settings.forms;
          uploadFinished();
        })
        .catch(uploadFinished);
    };

    $('#forms-upload-json .uploader').on('change', upload);
    $('#forms-upload-json .choose').on('click', e => {
      e.preventDefault();
      $('#forms-upload-json .uploader').click();
    });

    const loadForms = () => {
      Settings()
        .then(settings => {
          $scope.forms = settings.forms;
          $scope.download = generateDownload(settings.forms);
        })
        .catch(err => $log.error('Error fetching settings', err));
    };

    loadForms();

  });
