angular.module('inboxServices').factory('AddAttachment',
  function() {
    'ngInject';
    'use strict';

    /**
     * @ngdoc service
     * @name AddAttachment
     * @description Creates and attaches data to a couchdb doc
     * @memberof inboxServices
     * @param {Object} doc The doc to add the attachment to
     * @param {string} name The name of the attachment
     * @param {string} content The data to include in the attachment
     * @param {string} contentType The mime type of data, eg: 'application/xml'
     * @param {boolean} alreadyEncoded (default false) If true, assumes
     *   the content is already base64 encoded and doesn't do it again
     */
    return function(doc, name, content, contentType, alreadyEncoded) {
      if (!doc._attachments) {
        doc._attachments = {};
      }
      if (!alreadyEncoded) {
        content = new Blob([ content ], { type: contentType });
      }
      doc._attachments[name] = {
        data: content,
        content_type: contentType
      };
    };
  });
