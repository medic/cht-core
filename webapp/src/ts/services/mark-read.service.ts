import { Injectable } from '@angular/core';

import { DbService } from './db.service';
import { ReadDocsProvider } from '@mm-providers/read-docs.provider';

@Injectable({
  providedIn: 'root'
})
export class MarkReadService {

  constructor(
    private dbService: DbService,
    private readDocsProvider: ReadDocsProvider
  ) { }

  markAsRead(docs) {
    if (!docs || !docs.length) {
      return Promise.resolve();
    }

    const metaDocs = docs.map(doc => {
      return { _id: this.readDocsProvider.getId(doc) };
    });

    return this.dbService
      .get({ meta: true })
      .bulkDocs(metaDocs);
  }
}
