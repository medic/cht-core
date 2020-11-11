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

    const metaDocs = docs
      .map(doc => ({ _id: this.readDocsProvider.getId(doc) }))
      .filter(doc => doc._id);

    if (!metaDocs.length) {
      return Promise.resolve();
    }

    return this.dbService
      .get({ meta: true })
      .bulkDocs(metaDocs);
  }
}
