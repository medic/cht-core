const Page = require('./page');

class ReportsPage extends Page {

  async loadReportList(settingsProvider) {
    const page = settingsProvider.getPage('reportList');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

  async searchReport(settingsProvider) {
    const page = settingsProvider.getPage('reportList');
    const commonElements = settingsProvider.getCommonElements();
    await super.search(page, commonElements);
  }

}

module.exports = new ReportsPage();
