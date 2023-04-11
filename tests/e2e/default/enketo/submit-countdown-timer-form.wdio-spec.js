const countdownTimerPage = require('../../../page-objects/default/enketo/countdown-timer.wdio.page');
const common = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const utils = require('../../../utils');
const userData = require('../../../page-objects/default/users/user.data');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');

const { userContactDoc, docs } = userData;

describe('Countdown timer widget', () => {
  
  before(async () => {
    await utils.saveDocs(docs);
    await countdownTimerPage.configureForm(userContactDoc);
    await loginPage.cookieLogin();
    await common.hideSnackbar();
  });

  it('interact with timer and submit', async () => {
    await common.goToReports();

    await reportsPage.openForm(countdownTimerPage.TITLE);
    await countdownTimerPage.clickTimer(); // start
    await countdownTimerPage.clickTimer(); // stop
    await reportsPage.submitForm();

    const reportId = await reportsPage.getCurrentReportId();
    const report = await utils.getDoc(reportId);
    expect(report.fields.group).to.deep.equal({ timer: '' }); // there is no output from the widget
  });

});
