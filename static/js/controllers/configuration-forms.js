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
      $q,
      $scope,
      AddAttachment,
      DB,
      FileReader,
      JsonParse,
      Settings,
      UpdateSettings,
      XmlForms
    ) {

      'ngInject';

      $scope.json = { uploading: false };
      $scope.xform = { uploading: false };

      var uploadJsonFinished = function(err) {
        uploadFinished('json', err);
      };

      var uploadXFormFinished = function(err) {
        uploadFinished('xform', err);
      };

      var uploadFinished = function(type, err) {
        $scope[type] = {
          uploading: false,
          error: !!err,
          success: !err,
        };
        if (err) {
          $log.error('Upload failed', err);
        }
      };

      var uploadXForm = function() {
        $scope.xform = {
          uploading: true,
          error: false,
          success: false,
        };

        var formFiles = $('#forms-upload-xform .form.uploader')[0].files;
        if (!formFiles || formFiles.length === 0) {
          uploadXFormFinished(new Error('XML file not found'));
          return $scope.$apply(); // upload triggered with jQuery
        }

        var contextFiles = $('#forms-upload-xform .context.uploader')[0].files;
        if (!contextFiles || contextFiles.length === 0) {
          uploadXFormFinished(new Error('JSON context file not found'));
          return $scope.$apply(); // upload triggered with jQuery
        }

        $q.all([
            FileReader(formFiles[0]),
            FileReader(contextFiles[0]).then(JsonParse) ])
          .then(function(results) {
            var xml = results[0];
            var context = results[1];

            var $xml = $($.parseXML(xml));
            var title = $xml.find('title').text();

            var dataNode = $xml.find('instance').children().first();
            if (!dataNode.children('meta').children('instanceID').length) {
              throw new Error('No <meta><instanceID/></meta> node found for first child of <instance> element.');
            }

            var formId = dataNode.attr('id');
            if (!formId) {
              throw new Error('No ID attribute found for first child of <instance> element.');
            }

            var update = function(doc) {
              doc.context = context;
              doc.title = title;
              doc.type = 'form';
              doc.internalId = formId;
              AddAttachment(doc, 'xml', xml, 'application/xml');
              return doc;
            };

            var couchId = 'form:' + formId;
            DB().get(couchId, { include_attachments:true })
              .catch(function(err) {
                if (err.status === 404) {
                  return { _id:couchId };
                }
                throw err;
              })
              .then(function(doc) {
                return DB().put(update(doc));
              })
              .then(function() {
                uploadXFormFinished();
              })
              .catch(uploadXFormFinished);
          })
          .catch(uploadXFormFinished);
      };

      var uploadJsonForms = function() {
        $scope.json = {
          uploading: true,
          error: false,
          success: false,
        };
        var files = $('#forms-upload-json .uploader')[0].files;
        if (!files || files.length === 0) {
          uploadJsonFinished(new Error('File not found'));
        }
        var settings = { forms: {} };
        FileReader(files[0])
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
            uploadJsonFinished();
          })
          .catch(uploadJsonFinished);
      };

      $('#forms-upload-json .uploader').on('change', uploadJsonForms);
      $('#forms-upload-json .choose').on('click', function(_ev) {
        _ev.preventDefault();
        $('#forms-upload-json .uploader').click();
      });

      $('#forms-upload-xform .upload').on('click', uploadXForm); // can't get ng-click working :¬\

      Settings()
        .then(function(settings) {
          $scope.forms = settings.forms;
          $scope.download = generateDownload(settings.forms);
        })
        .catch(function(err) {
          $log.error('Error fetching settings', err);
        });

      XmlForms('configuration-forms', { ignoreContext:true }, function(err, forms) {
        if (err) {
          return console.log('Error fetching XForms for form config page.', err);
        }
        $scope.xForms = forms;
      });
    }
  );

}());
