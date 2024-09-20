const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const userSettingsElements = require('@page-objects/default/users/user-settings.wdio.page');
const contactElements = require('@page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const sentinelUtils = require('@utils/sentinel');

const languageCode = 'hil';

const createLanguage = async () =>  {
  await utils.addTranslations(languageCode, {
    'n.month': '{MONTHS, plural, =1{1 luna} other{# luni}}',
    'n.week': '{WEEKS, plural, =1{1 saptamana} other{# saptamani}}',
    'reports.none.n.months':
      '{MONTHS, plural, =1{No reports in the last month.} other{No reports in the last # months.}}',
    'task.days.left': '{DAYS, plural, =1{1 day left} other{# days left}',
    'tasks.none.n.weeks': '{WEEKS, plural, =1{No tasks in the next week.} other{No tasks in the next # weeks.}}',
    'Reports': 'HilReports',
    'view.all': 'View all'
  });
  await utils.enableLanguage(languageCode);
};

const createContact = () => {
  return placeFactory.place().build({
    name: 'hil district',
    type: 'district_hospital',
    reported_date: 1000,
    parent: '',
  });
};

let contact;

describe('Testing Incorrect locale', () => {

  beforeEach(() => {
    contact = createContact();
  });

  afterEach(async () => {
    await utils.deleteDocs([ contact._id, `messages-${languageCode}` ]);
    await utils.revertSettings(true);
    await browser.setCookies({ name: 'locale', value: 'en' });
  });
  
  it('should work with incorrect locale', async () => {
    await loginPage.cookieLogin();
    await utils.saveDoc(contact);
    await sentinelUtils.waitForSentinel();
    const waitForServiceWorker = await utils.waitForApiLogs(utils.SW_SUCCESSFUL_REGEX);
    await createLanguage();
    await waitForServiceWorker.promise;
    await commonElements.closeReloadModal(true);

    await userSettingsElements.setLanguage(languageCode);

    const text = await commonElements.getReportsButtonLabel().getText();
    expect(text).to.equal('HilReports');

    await commonElements.goToPeople();
    await commonElements.waitForPageLoaded();
    await contactElements.selectLHSRowByText('hil district');

    const reportsFilter = await contactElements.getReportFiltersText();
    expect(reportsFilter.sort()).to.deep.equal(['3 luni', '6 luni', 'View all'].sort());

    const tasksFilter = await contactElements.getReportTaskFiltersText();
    expect(tasksFilter.sort()).to.deep.equal(['1 saptamana', '2 saptamani', 'View all'].sort());
  });
});
