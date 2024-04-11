import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { GetSubjectSummariesService } from '@mm-services/get-subject-summaries.service';
import { GetSummariesService } from '@mm-services/get-summaries.service';
import { HydrateContactNamesService } from '@mm-services/hydrate-contact-names.service';

/**
 * Gets data records by the given array of ids.
 *
 * If options.include_docs is false, returns the summary, eg:
 *    {
 *      _id: 'myuuid',
 *      name: 'John Smith',
 *      type: 'person',
 *      lineage: [ 'Dunedin' ]
 *    }
 * The summary will contain different data based on the doc type,
 * as defined in the doc_summaries_by_id view.
 *
 * If options.include_docs is true, returns the full doc.
 */
@Injectable({
  providedIn: 'root'
})
export class GetDataRecordsService {
  constructor(
    private dbService:DbService,
    private getSubjectSummariesService:GetSubjectSummariesService,
    private getSummariesService:GetSummariesService,
    private hydrateContactNames:HydrateContactNamesService,
  ) {}

  private getDocs(ids) {
    return this.dbService
      .get()
      .allDocs({ keys: ids, include_docs: true })
      .then(response => response.rows.map(row => row.doc));
  }

  private async prepareSummaries(summaries, options?) {
    if (options.hydrateContactNames) {
      summaries = await this.hydrateContactNames.get(summaries);
    }

    return await this.getSubjectSummariesService.get(summaries);
  }

  async get(ids: string[], options?) {
    if (!ids?.length) {
      return Promise.resolve([]);
    }

    const opts = { hydrateContactNames: false, include_docs: false, ...options};
    if (opts.include_docs) {
      return this.getDocs(ids);
    }

    const summaries = await this.getSummariesService.get(ids);
    return this.prepareSummaries(summaries, opts);
  }

  async getDocsSummaries(docs, options?) {
    if (!docs?.length) {
      return Promise.resolve([]);
    }

    const opts = { hydrateContactNames: false, ...options};
    const summaries = this.getSummariesService.getByDocs(docs);
    return this.prepareSummaries(summaries, opts);
  }
}
