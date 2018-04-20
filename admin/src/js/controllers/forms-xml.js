var _ = require('underscore');

angular.module('controllers').controller('FormsXmlCtrl',
  function (
    $log,
    $q,
    $scope,
    AddAttachment,
    DB,
    FileReader,
    JsonParse
  ) {

    'use strict';
    'ngInject';

    $scope.status = { uploading: false };

    var uploadFinished = function(err) {
      if (err) {
        $log.error('Upload failed', err);
      } else {
        $('#forms-upload-xform').get(0).reset(); // clear the fields
      }
      $scope.status = {
        uploading: false,
        error: !!err,
        success: !err,
      };
    };

    var getForms = function() {
      return DB()
        .query('medic-client/forms', { include_docs: true })
        .then(function(res) {
          return res.rows
            .filter(function(row) {
              return row.doc._attachments.xml;
            })
            .map(function(row) {
              return row.doc;
            });
        });
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
        FileReader.utf8(formFiles[0]),
        FileReader.utf8(metaFiles[0]).then(JsonParse)
      ])
        .then(function(results) {
          var xml = results[0];
          var meta = results[1];

          var $xml = $($.parseXML(xml));

          // TODO $xml.find('title') works in Chrome 44, but not in Chrome 60.
          // It's probably related to XML namespaces, but we should work out why
          // it doesn't work in newer Chrome and get it working.
          var title = $xml.find('title').text();
          if (!title) {
            var match = xml.match(/<h:title[^>]*>([^<]*)<\/h:title>/);
            if (match) {
              title = match[1];
            }
          }

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

    getForms()
      .then(function(forms) {
        $scope.xForms = forms;
      })
      .catch(function(err) {
        $log.error('Error fetching XForms for form config page.', err);
      });
  }
);
