const Page = require('@page-objects/apdex/page');

class ReportsPage extends Page {

  async loadReportList(settingsProvider) {
    const page = settingsProvider.getPage('reports');
    await super.loadAndAssertPage(page);
  }

}

module.exports = new ReportsPage();
