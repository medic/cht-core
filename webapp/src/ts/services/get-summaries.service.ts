import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';

const summarise = require('@medic/doc-summaries');

@Injectable({
  providedIn: 'root'
})
export class GetSummariesService {
  constructor(
    private dbService:DbService,
  ) {
  }

  async get(ids?) {
    if (!ids?.length) {
      return Promise.resolve([]);
    }

    const result = await this.dbService
      .get()
      .allDocs({ keys: ids, include_docs: true });

    return result?.rows
      ?.map(row => summarise(row.doc))
      .filter(summary => summary);
  }

  getByDocs(docs) {
    if (!docs?.length) {
      return [];
    }

    return docs
      .map(doc => summarise(doc))
      .filter(summary => summary);
  }
}
