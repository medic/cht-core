import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { FileReaderService } from '@mm-services/file-reader.service';

export const REPORT_ATTACHMENT_NAME = 'content';

@Injectable({
  providedIn: 'root'
})
export class GetReportContentService {
  constructor(
    private dbService:DbService,
    private fileReaderService:FileReaderService,
  ) {
  }

  getReportContent(doc?) {
    // creating a new doc - no content
    if (!doc || !doc._id) {
      return Promise.resolve();
    }

    // TODO: check doc.content as this is where legacy documents stored
    //       their XML. Consider removing this check at some point in the
    //       future.
    if (doc.content) {
      return Promise.resolve(doc.content);
    }

    // old style report content
    if (doc._attachments && doc._attachments[REPORT_ATTACHMENT_NAME]) {
      return this.dbService
        .get()
        .getAttachment(doc._id, REPORT_ATTACHMENT_NAME)
        .then(content => this.fileReaderService.utf8(content));
    }

    return Promise.resolve(doc.fields);
  }
}
