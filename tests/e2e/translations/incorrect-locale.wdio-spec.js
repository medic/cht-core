const utils = require('../../utils');
const commonElements = require('../../page-objects/common/common.wdio.page');
const userSettingsElements = require('../../page-objects/user-settings/user-settings.wdio.page');
const contactElements = require('../../page-objects/contacts/contacts.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const { expect } = require('chai');

describe('Incorrect locale', () => {
  const createLanguage = () =>  utils.addTranslations('hil', {
    'n.month': '{MONTHS, plural, =1{1 luna} other{# luni}}',
    'n.week': '{WEEKS, plural, =1{1 saptamana} other{# saptamani}}',
    'reports.none.n.months':
      '{MONTHS, plural, =1{No reports in the last month.} other{No reports in the last # months.}}',
    'task.days.left': '{DAYS, plural, =1{1 day left} other{# days left}',
    'tasks.none.n.weeks': '{WEEKS, plural, =1{No tasks in the next week.} other{No tasks in the next # weeks.}}',
    'Reports': 'HilReports',
  });

  const createContact = () => utils.saveDoc({
    _id: 'district_hil_locale',
    name: 'hil district',
    type: 'district_hospital',
    reported_date: 1000,
    parent: '',
  });

  before(async () => await loginPage.cookieLogin());
  beforeEach(async () => {
    await createContact();
    await createLanguage();
  });

  afterEach(async () => {
    await browser.setCookies({ name: 'locale', value: 'en' });
    await browser.refresh();
  });

    // open user settings modal
  it('should work with incorrect locale',async () => {
    await commonPage.openHamburgerMenu();
    await commonPage.openUserSettingsAndFetchProperties();
    await userSettingsElements.openEditSettings();

    // change language
    await userSettingsElements.selectLanguage('hil');
    // wait for language to load
    await browser.pause(
      async () => await (await commonElements.getReportsButtonLabel()).getText() === 'HilReports',
      2000,
      'Translations for Hil were not applied'
    );

    // we have correct language!
    const text = await commonElements.getReportsButtonLabel().getText();
    expect(text).to.equal('HilReports');

    await commonElements.goToPeople();
    await contactElements.selectLHSRowByText('hil district');
    await commonElements.waitForPageLoaded();

    const reportsFilter = await contactElements.getReportFiltersText();
    expect(reportsFilter.sort()).to.deep.equal(['3 luni', '6 luni', 'View all'].sort());

    const tasksFilter = await contactElements.getReportTaskFiltersText(30000);
    expect(tasksFilter.sort()).to.deep.equal(['1 saptamana', '2 saptamani', 'View all'].sort());
  });
});
