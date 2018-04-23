/**
 * Service to create and attach data to a couchdb doc
 */
angular.module('inboxServices').factory('AddAttachment',
  function() {
    'ngInject';
    'use strict';

    return function(doc, name, content, contentType) {
      if (!doc._attachments) {
        doc._attachments = {};
      }
      var blob = new Blob([ content ], { type: contentType });
      doc._attachments[name] = {
        data: blob,
        content_type: contentType
      };
    };
  }
);
