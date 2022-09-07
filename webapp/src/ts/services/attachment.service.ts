import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AttachmentService {
  /**
   * @ngdoc service
   * @name AttachmentService
   * @description Creates and attaches data to a couchdb doc
   * @memberof inboxServices
   * @param {Object} doc The doc to add the attachment to
   * @param {string} name The name of the attachment
   * @param {string} content The data to include in the attachment
   * @param {string} contentType The mime type of data, eg: 'application/xml'
   * @param {boolean} alreadyEncoded (default false) If true, assumes
   *   the content is already base64 encoded and doesn't do it again
   */
  add(doc, name, content, contentType, alreadyEncoded?) {
    if (!doc) {
      return;
    }

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
  }

  remove(doc, name) {
    if (!doc || !doc._attachments || !name) {
      return;
    }

    delete doc._attachments[name];
  }
}
