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

  beforeEach((done) => {
    createContact()
      .then(() => createLanguage())
      .then(() => done())
      .catch(done.fail);
  });

  afterEach((done) => {
    browser.manage().addCookie({ name: 'locale', value: 'en' });
    utils.afterEach(done);
  });

  it('should work with incorrect locale',async () => {
    await commonElements.openMenu();
    await commonElements.openSubmenu('user settings');

    // open user settings modal
    await editSettingsLink();

    // change language
    await helper.selectDropdownByValue(getLanguageField(), 'hil', 2);
    await helper.waitUntilReady(getSubmitButton());
    await getSubmitButton().click();

    // wait for language to load
    await helper.waitForAngularComplete();
    await commonElements.goToPeople();
    await helper.waitElementToPresent(element(by.css('#contacts-list .unfiltered .content')));
    await helper.clickElement(element(by.css('#contacts-list .unfiltered .content')));

    // we have correct language!
    const text = await element(by.css('#reports-tab .button-label')).getText();
    expect(text).toEqual('HilReports');

    const reportsFilter = helper.getTextFromElements(element.all(by.css('.card.reports .table-filter a')));
    expect(reportsFilter).toEqual(['3 luni', '6 luni', 'view.all']);

    const tasksFilter = helper.getTextFromElements(element.all(by.css('.card.tasks .table-filter a')));
    expect(tasksFilter).toEqual(['1 saptamana', '2 saptamani', 'view.all']);
  });
});
