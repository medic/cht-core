'use strict';
const fileManager = require( 'enketo-core/src/js/file-manager' ).default;
const enketoConstants = require( './constants' );
const windowLib = require('./lib/window');

fileManager.isTooLarge = function( file ) {
  return file && file.size > enketoConstants.maxAttachmentSize;
};

fileManager.getMaxSizeReadable = function () {
  return enketoConstants.maxAttachmentSizeReadable;
};

const getCurrentDocId = () => {
  const path = windowLib.getCurrentHref().split('/');
  if (path.at(-2) === 'edit') {
    return path.at(-1);
  }
  if (path.at(-1) === 'edit') {
    return path.at(-2);
  }
  return null;
};

// Used by the draw widget. Loads image file into the canvas to annotate.
// Also used to re-load draw images when editing a report.
fileManager.getObjectUrl = (subject) => {
  if (subject && (typeof subject !== 'string' || /https?:\/\//.test(subject))) {
    // Deliberately avoid calling fileManager.urlToBlob since it violates the CSP
    return Promise.resolve(URL.createObjectURL(subject));
  }

  // If editing a report with a draw image, need to fetch the image attachment from the database
  const currentDocId = getCurrentDocId();
  if (!subject || !currentDocId) {
    return Promise.resolve(null);
  }
  // Do not need to support the legacy attachment names because the draw widget was added at the same time as
  // the new attachment naming scheme.
  const attachmentName = `user-file-${subject}`;
  return window.CHTCore.DB
    .get()
    .getAttachment(currentDocId, attachmentName)
    .then(blob => URL.createObjectURL(blob))
    .catch(e => {
      if (e.status === 404) {
        // eslint-disable-next-line no-console
        console.error(`Could not find attachment [${attachmentName}] on doc [${currentDocId}].`);
        return null;
      }

      throw e;
    });
};

// Exposing to overwrite enketo's file-manager
module.exports = fileManager;
