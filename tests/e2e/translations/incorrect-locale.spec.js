const utils = require('../../utils');
const helper = require('../../helper');
const commonElements = require('../../page-objects/common/common.po.js');

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

  const editSettingsLink = async () => {
    await helper.waitUntilReady(element(by.css('.content .configuration')));
    const link = element.all(by.css('.content .configuration .btn-link')).last();
    return link.click();
  };

  const getLanguageField = () => {
    return element(by.id('language'));
  };

  const getSubmitButton = () => {
    return element(by.css('.btn.submit.btn-primary:not(.ng-hide)'));
  };

  beforeEach(async () => {
    await createContact();
    await createLanguage();
  });

  afterEach(async () => {
    await browser.manage().addCookie({ name: 'locale', value: 'en' });
    await utils.afterEach();
  });

  it('should work with incorrect locale',async () => {
    await commonElements.openMenuNative();
    await commonElements.checkUserSettings();

    // open user settings modal
    await editSettingsLink();

    // change language
    await helper.selectDropdownByValue(getLanguageField(), 'hil', 2);
    await helper.clickElementNative(getSubmitButton());

    // wait for language to load
    await browser.wait(
      async () => await element(by.css('#reports-tab .button-label')).getText() === 'HilReports',
      2000
    );

    // we have correct language!
    const text = await element(by.css('#reports-tab .button-label')).getText();
    expect(text).toEqual('HilReports');

    await commonElements.goToPeople();
    await helper.clickElementNative(element(by.css('#contacts-list .content')));

    const reportsFilter = await helper.getTextFromElements(element.all(by.css('.card.reports .table-filter a')));
    expect(reportsFilter.sort()).toEqual(['3 luni', '6 luni', 'View all'].sort());

    const tasksFilter = await helper.getTextFromElements(element.all(by.css('.card.tasks .table-filter a')));
    expect(tasksFilter.sort()).toEqual(['1 saptamana', '2 saptamani', 'View all'].sort());
  });
});
