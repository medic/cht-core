import * as _ from 'lodash-es';
import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { GetSubjectSummariesService } from './get-subject-summaries.service';
import { GetSummariesService } from './get-summaries.service';
import { HydrateContactNamesService } from './hydrate-contact-names.service';

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
      .then((response) => {
        return _.map(response.rows, 'doc');
      });
  };

  private getSummaries(ids, options) {
    return this.getSummariesService
      .get(ids)
      .then(summaries => {
        const promiseToSummary = options.hydrateContactNames ?
                                 this.hydrateContactNames.get(summaries) : Promise.resolve(summaries);
        return promiseToSummary.then((summaries) => this.getSubjectSummariesService.get(summaries));
      });
  };

  get(ids, options) {
    const opts = Object.assign({ hydrateContactNames: false, include_docs: false }, options);

    if (!ids) {
      return Promise.resolve([]);
    }
    const arrayGiven = _.isArray(ids);
    if (!arrayGiven) {
      ids = [ ids ];
    }
    if (!ids.length) {
      return Promise.resolve([]);
    }
    const getPromise = opts.include_docs ? this.getDocs(ids) : this.getSummaries(ids, opts);
    return getPromise
      .then((response) => {
        if (!arrayGiven) {
          response = response.length ? response[0] : null;
        }
        return response;
      });
  }
}
