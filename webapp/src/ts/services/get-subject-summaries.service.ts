import * as _ from 'lodash-es';
import {Injectable} from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { GetSummariesService } from '@mm-services/get-summaries.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';

@Injectable({
  providedIn: 'root'
})
export class GetSubjectSummariesService {
  constructor(
    private dbService:DbService,
    private getSummariesService:GetSummariesService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
  ) {
  }

  private findSubjectId(response, id) {
    const parent = _.find(response.rows, (row) => {
      return id && row.key[1] === id.toString() || false;
    });
    return (parent && parent.id) || null;
  }

  private replaceReferencesWithIds(summaries, response) {
    summaries.forEach((summary) => {
      if (summary.subject.type === 'reference' && summary.subject.value) {
        const id = this.findSubjectId(response, summary.subject.value);
        if (id) {
          summary.subject = {
            value: id,
            type: 'id'
          };
        } else {
          //update the type only, in case patient_id contains a doc UUID
          summary.subject.type = 'id';
        }
      }
    });

    return summaries;
  }

  private findSubjectName(response, id) {
    const parent = _.find(response, { _id: id });
    return (parent && parent.name) || null;
  }

  private replaceIdsWithNames(summaries, response) {
    summaries.forEach((summary) => {
      if (summary.subject && summary.subject.type === 'id' && summary.subject.value) {
        const name = this.findSubjectName(response, summary.subject.value);
        if (name) {
          summary.subject = {
            _id: summary.subject.value,
            value: name,
            type: 'name'
          };
        }
      }
    });
    return summaries;
  }

  private processContactIds(summaries) {
    const ids = summaries
      .filter(summary => summary.subject && summary.subject.type === 'id' && summary.subject.value)
      .map(summary => summary.subject.value);

    if (!ids.length) {
      return Promise.resolve(summaries);
    }

    const uniqueIds = [...new Set(ids)];

    return this
      .getSummariesService.get(uniqueIds)
      .then((response) => {
        return this.replaceIdsWithNames(summaries, response);
      });
  }

  private validateSubjects(summaries) {
    summaries.forEach((summary) => {
      if (!summary.subject) {
        return;
      }

      summary.validSubject = true;

      if (!summary.subject.type) {
        summary.subject.value = summary.contact || summary.from;
      } else if (summary.subject.type !== 'name' || !summary.subject.value) {
        summary.validSubject = false;
      }
    });

    return summaries;
  }

  private processReferences(summaries) {
    const references = summaries
      .filter(summary => summary.subject && summary.subject.type === 'reference' && summary.subject.value)
      .map(summary => summary.subject.value);

    if (!references.length) {
      return Promise.resolve(summaries);
    }

    const uniqueReferences = [...new Set(references)];

    uniqueReferences.forEach((reference, key) => {
      uniqueReferences[key] = ['shortcode', reference];
    });

    return this.dbService.get()
      .query('medic-client/contacts_by_reference', { keys: uniqueReferences })
      .then((response) => {
        return this.replaceReferencesWithIds(summaries, response);
      });
  }

  private hydrateSubjectLineages(summaries, response) {
    return _.forEach(summaries, (summary) => {
      if (summary.subject && summary.subject._id) {
        Object.assign(summary.subject, _.find(response, {_id: summary.subject._id}));
      }
    });
  }

  private compactSubjectLineage(summaries) {
    return _.forEach(summaries, (summary) => {
      if (summary.subject && summary.subject.lineage) {
        summary.subject.lineage = _.compact(_.map(summary.subject.lineage, (parent) => {
          return parent && parent.name;
        }));
      }
    });
  }

  private processSubjectLineage(summaries) {
    const subjectIds = _.uniq(_.compact(summaries.map((summary) => {
      return summary.subject && summary.subject._id;
    })));

    if (!subjectIds.length) {
      return Promise.resolve(summaries);
    }

    return this.lineageModelGeneratorService
      .reportSubjects(subjectIds)
      .then((response) => {
        return this.hydrateSubjectLineages(summaries, response);
      });
  }

  get(summaries, hydratedLineage = false) {
    let containsReports = false;

    if (!summaries) {
      return [];
    }

    summaries.forEach((summary) => {
      if (summary.form) {
        containsReports = true;
      }
    });

    if (!containsReports) {
      return Promise.resolve(summaries);
    }

    return this
      .processReferences(summaries)
      .then((summaries) => this.processContactIds(summaries))
      .then((summaries) => this.processSubjectLineage(summaries))
      .then((summaries) => {
        if (!hydratedLineage) {
          return this.compactSubjectLineage(summaries);
        }
        return summaries;
      })
      .then(summaries => this.validateSubjects(summaries));
  }
}
