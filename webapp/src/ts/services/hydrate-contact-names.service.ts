import * as _ from 'lodash-es';
import {Injectable} from '@angular/core';
import {GetSummariesService} from '@mm-services/get-summaries.service';

@Injectable({
  providedIn: 'root'
})
export class HydrateContactNamesService {
  constructor(private getSummariesService:GetSummariesService) {
  }

  private findContactName(contactSummaries, id) {
    const cs = _.find(contactSummaries, { _id: id });
    return (cs && cs.name) || null;
  }

  private findMutedState(contactSummaries, id) {
    const cs = _.find(contactSummaries, { _id: id });
    return cs?.muted || false;
  }

  private replaceContactIdsWithNames(summaries, contactSummaries) {
    summaries.forEach((summary) => {
      if (summary.contact) {
        summary.contact = this.findContactName(contactSummaries, summary.contact);
      }
      if (summary.lineage && summary.lineage.length) {
        summary.lineage = summary.lineage.map((id) => {
          return this.findContactName(contactSummaries, id);
        });
      }
    });
    return summaries;
  }

  private getMutedState(summaries, contactSummaries) {
    summaries.forEach((summary) => {
      if (!summary || summary.muted || !summary.lineage || !summary.lineage.length) {
        return;
      }

      summary.muted = !!summary.lineage.find((id) => {
        return this.findMutedState(contactSummaries, id);
      });
    });

    return summaries;
  }

  private relevantIdsFromSummary(summary) {
    // Pull lineages as well so we can pull their names out of the summaries
    return [summary.contact].concat(summary.lineage);
  }

  /**
   * Replace contact ids with their names for ids
   */
  get(summaries) {
    const ids = _.uniq(_.compact(_.flattenDeep(summaries.map(this.relevantIdsFromSummary))));
    if (!ids.length) {
      return Promise.resolve(summaries);
    }

    return this.getSummariesService.get(ids).then((response) => {
      summaries = this.getMutedState(summaries, response);
      return this.replaceContactIdsWithNames(summaries, response);
    });
  }
}
