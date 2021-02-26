import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { FileReaderService } from '@mm-services/file-reader.service';

@Injectable({
  providedIn: 'root'
})
export class GetReportContentService {
  constructor(
    private dbService:DbService,
    private fileReaderService:FileReaderService,
  ) {
  }

  readonly REPORT_ATTACHMENT_NAME = 'content';


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
    // check new style attached form content
    return this.dbService
      .get()
      .getAttachment(doc._id, this.REPORT_ATTACHMENT_NAME)
      .then(content => this.fileReaderService.utf8(content));
  }
}
