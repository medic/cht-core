const utils = require('../../../utils');
const helper = require('../../../helper');
const commonElements = require('../../../page-objects/protractor/common/common.po.js');
const userSettingsElements = require('../../../page-objects/protractor/users/user-settings.po');
const contactElements = require('../../../page-objects/protractor/contacts/contacts.po');

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

  beforeEach(async () => {
    await createContact();
    await createLanguage();
    await utils.closeReloadModal();
  });

  afterEach(async () => {
    await browser.manage().addCookie({ name: 'locale', value: 'en' });
    await utils.resetBrowser();
    await utils.afterEach();
  });

  // open user settings modal
  it('should work with incorrect locale', async () => {
    await commonElements.openMenuNative();
    await commonElements.checkUserSettings();

    // open user settings modal
    await userSettingsElements.openEditSettings();

    // change language
    await helper.selectDropdownByValue(userSettingsElements.getLanguageField(), 'hil');
    await helper.clickElementNative(userSettingsElements.getSubmitButton());

    // wait for language to load
    await browser.wait(
      async () => await commonElements.getReportsButtonLabel().getText() === 'HilReports',
      2000,
      'Translations for Hil were not applied'
    );

    // we have correct language!
    const text = await commonElements.getReportsButtonLabel().getText();
    expect(text).toEqual('HilReports');

    await commonElements.goToPeople();
    await contactElements.selectLHSRowByText('hil district');

    const reportsFilter = await helper.getTextFromElements(contactElements.getReportsFilters(), 3);
    expect(reportsFilter.sort()).toEqual(['3 luni', '6 luni', 'View all'].sort());

    const tasksFilter = await helper.getTextFromElements(contactElements.getTasksFilters(), 3);
    expect(tasksFilter.sort()).toEqual(['1 saptamana', '2 saptamani', 'View all'].sort());
  });
});
