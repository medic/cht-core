/**
 * Service to create and attach data to a couchdb doc
 */
angular.module('inboxServices').factory('AddAttachment',
  function() {
    'ngInject';
    'use strict';

    /**
     * doc: The doc to add the attachment to
     * name: The name of the attachment
     * content: The data to include in the attachment
     * contentType: The mime type of data, eg: 'application/xml'
     * alreadyEncoded: (optional, defaults to false) If true, assumes
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
  }
);
