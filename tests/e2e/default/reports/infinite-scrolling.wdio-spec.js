const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const smsPregancy = require('../../../factories/cht/reports/sms-pregnancy');

const PAGE_SIZE = 50;
describe('Infinite scrolling', () => {
  before(async () => {
    const reports = Array
      .from({ length: 200 })
      .map(() => smsPregancy.pregnancy().build());
    await utils.saveDocs(reports);
    await loginPage.cookieLogin({ createUser: false });
  });

  it('should load multiple pages of reports', async () => {
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
