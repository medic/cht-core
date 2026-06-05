import { Injectable } from '@angular/core';
import { Contact, Qualifier, Report, summarise } from '@medic/cht-datasource';

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
    this.getContactSummaries = chtDatasourceService.bind(Contact.v1.getSummaries);
    this.getReportSummaries = chtDatasourceService.bind(Report.v1.getSummaries);
  }

  async getContacts(ids?) {
    if (!ids?.length) {
      return [];
    }

    return this.getContactSummaries(Qualifier.byUuids(ids));
  }

  async getReports(ids?) {
    if (!ids?.length) {
      return [];
    }

    return this.getReportSummaries(Qualifier.byUuids(ids));
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
