var _ = require('underscore');

angular.module('inboxControllers').controller('ConfigurationFormsXmlCtrl',
  function (
    $log,
    $q,
    $scope,
    $translate,
    AddAttachment,
    DB,
    FileReader,
    JsonParse,
    Snackbar,
    XmlForms
  ) {

    'use strict';
    'ngInject';

    $scope.status = { uploading: false };

    var uploadFinished = function(err) {
      if (err) {
        $log.error('Upload failed', err);
      } else {
        $translate('Upload succeeded').then(Snackbar);
        $('#forms-upload-xform').get(0).reset(); // clear the fields
      }
      $scope.status = {
        uploading: false,
        error: !!err,
        success: !err,
      };
    };

    $scope.upload = function() {
      $scope.status = {
        uploading: true,
        error: false,
        success: false,
      };

      var formFiles = $('#forms-upload-xform .form.uploader')[0].files;
      if (!formFiles || formFiles.length === 0) {
        return uploadFinished(new Error('XML file not found'));
      }

      var metaFiles = $('#forms-upload-xform .meta.uploader')[0].files;
      if (!metaFiles || metaFiles.length === 0) {
        return uploadFinished(new Error('JSON meta file not found'));
      }

      $q.all([
        FileReader(formFiles[0]),
        FileReader(metaFiles[0]).then(JsonParse)
      ])
        .then(function(results) {
          var xml = results[0];
          var meta = results[1];

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

          if (meta.internalId && meta.internalId !== formId) {
            throw new Error('The internalId property in the meta file will be overwritten by the ID attribute on the first child of <instance> element in the XML. Remove this property from the meta file and try again.');
          }

          var couchId = 'form:' + formId;
          return DB().get(couchId, { include_attachments:true })
            .catch(function(err) {
              if (err.status === 404) {
                return { _id: couchId };
              }
              throw err;
            })
            .then(function(doc) {
              doc.title = title;
              _.extend(doc, meta);
              doc.type = 'form';
              doc.internalId = formId;
              AddAttachment(doc, 'xml', xml, 'application/xml');
              return doc;
            });
        })
        .then(function(doc) {
          return DB().put(doc);
        })
        .then(function() {
          uploadFinished();
        })
        .catch(uploadFinished);
    };

    XmlForms('configuration-forms', { ignoreContext:true }, function(err, forms) {
      if (err) {
        return $log.error('Error fetching XForms for form config page.', err);
      }
      $scope.xForms = forms;
    });
  }
);
