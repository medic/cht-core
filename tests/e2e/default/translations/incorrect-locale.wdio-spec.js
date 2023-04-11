const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const userSettingsElements = require('../../../page-objects/default/users/user-settings.wdio.page');
const contactElements = require('../../../page-objects/default/contacts/contacts.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');

describe('Testing Incorrect locale', () => {
  const createLanguage = async () =>  await utils.addTranslations('hil', {
    'n.month': '{MONTHS, plural, =1{1 luna} other{# luni}}',
    'n.week': '{WEEKS, plural, =1{1 saptamana} other{# saptamani}}',
    'reports.none.n.months':
      '{MONTHS, plural, =1{No reports in the last month.} other{No reports in the last # months.}}',
    'task.days.left': '{DAYS, plural, =1{1 day left} other{# days left}',
    'tasks.none.n.weeks': '{WEEKS, plural, =1{No tasks in the next week.} other{No tasks in the next # weeks.}}',
    'Reports': 'HilReports',
    'view.all':'View all'
  });
  
  const contact = placeFactory.place().build({ 
    _id: 'district_hil_locale',
    name: 'hil district',
    type: 'district_hospital',
    reported_date: 1000,
    parent: '',
  });
  
  after(async () => await browser.setCookies({ name: 'locale', value: 'en' }));

  before(async () => {
    await loginPage.cookieLogin();
    await utils.saveDoc(contact);
    await createLanguage();
    await commonElements.closeReloadModal();
  });

  it('should work with incorrect locale', async () => {
    await commonElements.openHamburgerMenu();
    await commonElements.openUserSettingsAndFetchProperties();
    await userSettingsElements.openEditSettings();
    await userSettingsElements.selectLanguage('hil');

    const text = await commonElements.getReportsButtonLabel().getText();
    expect(text).to.equal('HilReports');

    await commonElements.goToPeople();
    await contactElements.selectLHSRowByText('hil district');

    const reportsFilter = await contactElements.getReportFiltersText();
    expect(reportsFilter.sort()).to.deep.equal(['3 luni', '6 luni', 'View all'].sort());

    const tasksFilter = await contactElements.getReportTaskFiltersText();
    expect(tasksFilter.sort()).to.deep.equal(['1 saptamana', '2 saptamani', 'View all'].sort());
  });
});
