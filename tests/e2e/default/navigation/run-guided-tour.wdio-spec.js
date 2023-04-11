const guidedTourPO = require('@page-objects/default/navigation/guided-tour.wdio.page.js');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');

describe('Guided tour', async () => {
  beforeEach(async () => {
    await loginPage.cookieLogin();
  });

  it('run and end guided tour => should close the tour', async () => {
    await commonPage.goToPeople();
    await guidedTourPO.runGuidedTour(true);
    expect(await guidedTourPO.isGuidedTourOpen()).to.equal(false);
  });

  it('run guided tour and change tab => should close the tour', async () => {
    await commonPage.goToPeople();
    await guidedTourPO.runGuidedTour(false);
    await commonPage.goToReports();
    expect(await guidedTourPO.isGuidedTourOpen()).to.equal(false);
  });
});

