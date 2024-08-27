const Page = require('@page-objects/apdex/page');
const REPORT_LIST = 'reportList';

class ReportsPage extends Page {

  async loadReportList() {
    await super.loadPage(REPORT_LIST);
  }

  async searchReport() {
    await super.searchPage(REPORT_LIST);
  }

}

module.exports = new ReportsPage();
