const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const placeFactory = require('../../../factories/cht/contacts/place');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const contactElements = require('../../../page-objects/default/contacts/contacts.wdio.page');
const district_hospital = placeFactory.generateHierarchy(['district_hospital']).get('district_hospital');

describe('MessageFormat', () => {
  const createContact = async () => {
    await utils.saveDoc(district_hospital);
  };

  before(async () => {
    await createContact();
    await loginPage.cookieLogin();
  });

  it('should display plurals correctly', async () => {
    await commonPage.goToPeople();
    await contactElements.selectLHSRowByText(district_hospital.name, false);

    const reportsFilter = await contactElements.getReportFiltersText();
    expect(reportsFilter).to.have.members(['3 months', '6 months', 'View all']);

    const tasksFilter = await contactElements.getReportTaskFiltersText();
    expect(tasksFilter).to.have.members(['1 week', '2 weeks', 'View all']);

  });

  it('should work with botched translations', async () => {
    await commonPage.goToReports();
    await utils.addTranslations('en', {
      'Messages': 'Messages {thing}',
      'Tasks': 'Tasks {thing',
      'Reports': 'Reports {{thing}}'
    });

    // wait for language to load
    await browser.waitUntil(async () => {
      return await (await commonPage.getReportsButtonLabel()).getText() === 'Reports {{thing}}';
    }, {
      timeout: 2000,
      timeoutMsg: 'Timed out waiting for translations to update'
    });

    expect(await (await commonPage.getReportsButtonLabel()).getText()).to.equal('Reports {{thing}}');
    expect(await (await commonPage.getTasksButtonLabel()).getText()).to.equal('Tasks {thing');
    expect(await (await commonPage.getMessagesButtonLabel()).getText()).to.equal('Messages {thing}');
  });
});
