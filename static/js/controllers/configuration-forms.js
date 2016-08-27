var moment = require('moment'),
    _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  var generateDownload = function(forms) {
    var content = JSON.stringify(_.values(forms), null, 4);
    var blob = new Blob([ content ], { type: 'application/json' });
    return {
      name: 'forms_' + moment().format('YYYY-MM-DD') + '.json',
      url: (window.URL || window.webkitURL).createObjectURL(blob)
    };
  };

  inboxControllers.controller('ConfigurationFormsCtrl',
    function (
      $log,
      $scope,
      FileReader,
      Settings,
      UpdateSettings
    ) {

      'ngInject';

      $scope.uploading = false;

      var uploadFinished = function(err) {
        $scope.uploading = false;
        $scope.error = !!err;
        $scope.success = !err;
        if (err) {
          $log.error('Upload failed', err);
        }
      };

      var uploadForms = function() {
        $scope.uploading = true;
        $scope.error = false;
        $scope.success = false;
        var files = $('#forms-upload-form .uploader')[0].files;
        if (!files || files.length === 0) {
          uploadFinished(new Error('File not found'));
        }
        var settings = { forms: {} };
        FileReader(files[0])
          .then(function(result) {
            try {
              // expects array of forms
              return JSON.parse(result);
            } catch(e) {
              throw new Error('Error parsing form json');
            }
          })
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

      $('#forms-upload-form .uploader').on('change', uploadForms);
      $('#forms-upload-form .choose').on('click', function(_ev) {
        _ev.preventDefault();
        $('#forms-upload-form .uploader').click();
      });
      Settings()
        .then(function(settings) {
          $scope.forms = settings.forms;
          $scope.download = generateDownload(settings.forms);
        })
        .catch(function(err) {
          $log.error('Error fetching settings', err);
        });
    }
  );

}());