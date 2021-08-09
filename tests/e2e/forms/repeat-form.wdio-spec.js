const fs = require('fs');

const constants = require('../../constants');
const utils = require('../../utils');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');

const xml = fs.readFileSync(`${__dirname}/../../../demo-forms/repeat-translation.xml`, 'utf8');
const formDocument = {
  _id: 'form:repeat-translation',
  internalId: 'repeat-translation',
  title: 'Repeat',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xml).toString('base64')
    }
  }
};
const userContactDoc = {
  _id: constants.USER_CONTACT_ID,
  name: 'Jack',
  date_of_birth: '',
  phone: '+64274444444',
  alternate_phone: '',
  notes: '',
  type: 'person',
  reported_date: 1478469976421,
  parent: {
    _id: 'some_parent'
  }
};

describe('RepeatForm', () => {
  before(async () => {
    await utils.seedTestData(userContactDoc, [formDocument]);
  });

  afterEach(async () => {
    await browser.deleteCookies();
    await browser.refresh();
  });

  it('should display the initial form and its repeated content in Swahili', async () => {
    const swUserName = 'Jina la mtumizi';
    await loginPage.changeLanguage('sw', swUserName);
    const currentLanguage = await loginPage.getCurrentLanguage();
    await loginPage.cookieLogin({ locale: currentLanguage.code });
    await commonPage.goToReports();
    await (await reportsPage.submitReportButton()).click();
    await (await reportsPage.formLinkByHref(formDocument.internalId)).click();

    const stateLabel = await $('#report-form .question-label.active[data-itext-id="/repeat/basic/state_1:label"]');
    expect(await stateLabel.getText()).toBe('Select a state: - SV');

    const addRepeatButton = await $('.btn.btn-default.add-repeat-btn');
    await addRepeatButton.click();

    const cityLabel = await $('#report-form .question-label.active[data-itext-id="/repeat/basic/rep/city_1:label"]');
    expect(await cityLabel.getText()).toBe('Select a city: - SV');

    // eslint-disable-next-line max-len
    const melbourneLabel = await $('#report-form .option-label.active[data-itext-id="/repeat/basic/rep/city_1/melbourne:label"]');
    expect(await melbourneLabel.getText()).toBe('ML');
  });

  it('should display the initial form and its repeated content in English', async () => {
    const enUserName = 'User name';
    await loginPage.changeLanguage('en', enUserName);
    const currentLanguage = await loginPage.getCurrentLanguage();
    await loginPage.cookieLogin({ locale: currentLanguage.code });
    await commonPage.goToReports();
    await (await reportsPage.submitReportButton()).click();
    await (await reportsPage.formLinkByHref(formDocument.internalId)).click();

    const stateLabel = await $('#report-form .question-label.active[data-itext-id="/repeat/basic/state_1:label"]');
    expect(await stateLabel.getText()).toBe('Select a state:');

    const addRepeatButton = await $('.btn.btn-default.add-repeat-btn');
    await addRepeatButton.click();

    const cityLabel = await $('#report-form .question-label.active[data-itext-id="/repeat/basic/rep/city_1:label"]');
    expect(await cityLabel.getText()).toBe('Select a city:');

    // eslint-disable-next-line max-len
    const melbourneLabel = await $('#report-form .option-label.active[data-itext-id="/repeat/basic/rep/city_1/melbourne:label"]');
    expect(await melbourneLabel.getText()).toBe('Melbourne');
  });
});
