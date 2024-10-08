const utils = require('@utils');
const login = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const smsPregnancy = require('@factories/cht/reports/sms-pregnancy');

describe('Infinite scrolling', () => {
  before(async () => {
    const reports = Array
      .from({ length: 200 })
      .map(() => smsPregnancy.pregnancy().build());
    await utils.saveDocs(reports);
    await login.cookieLogin({ createUser: false });
  });

  it('should load multiple pages of reports', async () => {
    const PAGE_SIZE = 50;

    await commonPage.goToReports();
    let nbrReports = await reportsPage.getAllReportsText();
    expect(nbrReports.length).to.equal(PAGE_SIZE);

    await commonPage.loadNextInfiniteScrollPage();
    nbrReports = await reportsPage.getAllReportsText();
    expect(nbrReports.length).to.equal(PAGE_SIZE * 2);

    await commonPage.loadNextInfiniteScrollPage();
    nbrReports = await reportsPage.getAllReportsText();
    expect(nbrReports.length).to.equal(PAGE_SIZE * 3);
  });
});
