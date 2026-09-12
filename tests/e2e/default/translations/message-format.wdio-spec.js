const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const contactElements = require('@page-objects/default/contacts/contacts.wdio.page');
const { createExtensionLibDoc } = require('@utils/extension-libs');

describe('MessageFormat', () => {
  const district_hospital = placeFactory.generateHierarchy(['district_hospital']).get('district_hospital');

  before(async () => {
    await utils.saveDoc(district_hospital);
    await loginPage.cookieLogin();
  });

  after(() => utils.revertDb([/^form:/], true));

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
      return await commonPage.isElementPresent('div*=Reports {{thing}}');
    }, {
      timeout: 2000,
      timeoutMsg: 'Timed out waiting for translations to update'
    });

    const tabsButtonLabelsNames = await commonPage.getAllButtonLabelsNames();
    expect(tabsButtonLabelsNames).to.include.members(['Reports {{thing}}', 'Tasks {thing', 'Messages {thing}']);
  });

  it('should render translations with extension-libs', async () => {
    const expectedLabel = 'Extension label: noitagivan stropeR';
    await utils.saveDoc(createExtensionLibDoc({
      'reverse-label.js':
        'module.exports = value => `Extension label: ${Array.from(value).reverse().join(\'\')}`;',
    }));
    await commonPage.reloadSession();
    await loginPage.cookieLogin();
    await utils.addTranslations('en', {
      Reports: '{{#reverse-label}}Reports navigation{{/reverse-label}}',
    });

    await browser.waitUntil(async () => {
      const labels = await commonPage.getAllButtonLabelsNames();
      return labels.includes(expectedLabel);
    }, {
      timeout: 5000,
      timeoutMsg: 'Timed out waiting for extension-lib translation to render',
    });

    const labels = await commonPage.getAllButtonLabelsNames();
    expect(labels.filter(label => label.startsWith('Extension label:'))).to.deep.equal([expectedLabel]);
  });
});
