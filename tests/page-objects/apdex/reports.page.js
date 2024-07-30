const Page = require('@page-objects/apdex/page');
const REPORT_LIST = 'reportList';

class ReportsPage extends Page {

  async loadReportList(settingsProvider) {
    const page = settingsProvider.getPage(REPORT_LIST);
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

  async searchReport(settingsProvider) {
    const page = settingsProvider.getPage(REPORT_LIST);
    const commonElements = settingsProvider.getCommonElements();
    await super.search(page, commonElements);
  }

}

module.exports = new ReportsPage();
