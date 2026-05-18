import { Injectable } from '@angular/core';
import { Contact, Report, summarise } from '@medic/cht-datasource';

import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

@Injectable({
  providedIn: 'root'
})
export class GetSummariesService {
  private readonly getContactSummaries;
  private readonly getReportSummaries;

  constructor(
    private chtDatasourceService: CHTDatasourceService,
  ) {
    this.getContactSummaries = this.chtDatasourceService.bind(Contact.v1.getSummaries);
    this.getReportSummaries = this.chtDatasourceService.bind(Report.v1.getSummaries);
  }

  async get(ids?) {
    if (!ids?.length) {
      return [];
    }

    const [contactSummaries, reportSummaries] = await Promise.all([
      this.getContactSummaries(ids),
      this.getReportSummaries(ids),
    ]);
    return [...contactSummaries, ...reportSummaries];
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
