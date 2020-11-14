import { Injectable } from '@angular/core';
import { FormatDataRecordService } from './format-data-record.service';
import { GetSubjectSummariesService } from './get-subject-summaries.service';
import { GetSummariesService } from './get-summaries.service';
import { LineageModelGeneratorService } from './lineage-model-generator.service';
import { isString } from 'lodash-es';

/**
 * Hydrates the given contact by uuid and creates a model which
 * holds the doc and associated information for rendering. eg:
 * {
 *   _id: <doc uuid>,
 *   doc: <doc>,
 *   contact: <doc reporter>,
 *   lineage: <array of contact's parents>,
 *   displayFields: <array of fields to show>,
 *   formatted: <the doc formatted using the FormatDataRecord service>
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class ReportViewModelGeneratorService {
  constructor(
    private formatDataRecordService:FormatDataRecordService,
    private getSubjectSummariesService:GetSubjectSummariesService,
    private getSummariesService:GetSummariesService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
  ) {
  }

  get(report) {
    const id = isString(report) ? report : report._id;
    return this.lineageModelGeneratorService
      .report(id)
      .then((model) => {
        if (!model.doc) {
          return model;
        }
        return this.formatDataRecordService
          .format(model.doc)
          .then((formatted) => {
            model.formatted = formatted;
            return model;
          });
      })
      .then((model) => {
        return this.getSummariesService
          .get([model.doc._id])
          .then((results) => {
            return this.getSubjectSummariesService.get(results, true);
          })
          .then((summaries) => {
            if (summaries && summaries.length) {
              model.formatted.subject = summaries.pop().subject;
            }

            return model;
          });
      });
  }
}

