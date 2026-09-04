import { Injectable } from '@angular/core';
import { Contact, Qualifier, Report } from '@medic/cht-datasource';
import { summarise } from '@medic/summaries';

import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

@Injectable({
  providedIn: 'root'
})
export class GetSummariesService {
  private readonly getContactSummaries: ReturnType<typeof Contact.v1.getSummaries>;
  private readonly getReportSummaries: ReturnType<typeof Report.v1.getSummaries>;

  constructor(
    chtDatasourceService: CHTDatasourceService,
  ) {
    this.getContactSummaries = chtDatasourceService.bindGenerator(Contact.v1.getSummaries);
    this.getReportSummaries = chtDatasourceService.bindGenerator(Report.v1.getSummaries);
  }

  async getContacts(ids?) {
    if (!ids?.length) {
      return [];
    }

    const summaries: Contact.v1.ContactSummary[] = [];
    for await (const summary of this.getContactSummaries(Qualifier.byIds(ids))) {
      summaries.push(summary);
    }
    return summaries;
  }

  async getReports(ids?) {
    if (!ids?.length) {
      return [];
    }

    const summaries: Report.v1.ReportSummary[] = [];
    for await (const summary of this.getReportSummaries(Qualifier.byIds(ids))) {
      summaries.push(summary);
    }
    return summaries;
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
