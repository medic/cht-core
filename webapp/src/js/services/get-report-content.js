angular
  .module('inboxServices')
  .service('GetReportContent', function(
    $q,
    DB,
    FileReader
  ) {
    'use strict';
    'ngInject';

    const REPORT_ATTACHMENT_NAME = 'content';
    getReportContent.REPORT_ATTACHMENT_NAME = REPORT_ATTACHMENT_NAME;
    return getReportContent;

    function getReportContent(doc) {
      // creating a new doc - no content
      if (!doc || !doc._id) {
        return $q.resolve();
      }
      // TODO: check doc.content as this is where legacy documents stored
      //       their XML. Consider removing this check at some point in the
      //       future.
      if (doc.content) {
        return $q.resolve(doc.content);
      }
      // check new style attached form content
      return DB().getAttachment(doc._id, REPORT_ATTACHMENT_NAME)
        .then(FileReader.utf8);
    }
  });
