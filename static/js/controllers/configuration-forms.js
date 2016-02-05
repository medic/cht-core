var moment = require('moment');

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
    ['$scope', 'Settings', 'UpdateSettings', 'FileReader',
    function ($scope, Settings, UpdateSettings, FileReader) {

      $scope.uploading = false;

      var uploadFinished = function(err) {
        $scope.uploading = false;
        $scope.error = !!err;
        $scope.success = !err;
        if (err) {
          console.log('Upload failed', err);
        }
      };

      var uploadForms = function() {
        $scope.uploading = true;
        $scope.error = false;
        $scope.success = false;
        var files = $('#forms-upload-form .uploader')[0].files;
        if (!files || files.length === 0) {
          uploadFinished('File not found');
        }
        FileReader(files[0])
          .then(function(result) {
            var settings = { forms: {} };
            try {
              // expects array of forms
              var json = JSON.parse(result);
              json.forEach(function(form) {
                if (form.meta && form.meta.code) {
                  settings.forms[form.meta.code.toUpperCase()] = form;
                }
              });
            } catch(e) {
              return uploadFinished(e);
            }
            UpdateSettings(settings, { replace: true }, function(err) {
              if (!err) {
                $scope.forms = settings.forms;
              }
              uploadFinished(err);
            });
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
          console.log('Error fetching settings', err);
        });
    }
  ]);

}());