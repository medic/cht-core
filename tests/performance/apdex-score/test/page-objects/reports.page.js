const Page = require('./page');

class ReportsPage extends Page {

  async loadReportList(settingsProvider) {
    const page = settingsProvider.getPage('report-list');
    await super.loadAndAssertPage(page);
  }

}

module.exports = new ReportsPage();
