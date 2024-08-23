const Page = require('@page-objects/apdex/page');
const REPORT_LIST = 'reportList';

class ReportsPage extends Page {

  async loadReportList(settingsProvider) {
    await super.loadPage(settingsProvider, REPORT_LIST);
  }

  async searchReport(settingsProvider) {
    await super.searchPage(settingsProvider, REPORT_LIST);
  }

}

module.exports = new ReportsPage();
