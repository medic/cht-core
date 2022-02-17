const fs = require('fs');

const constants = require('../../constants');
const utils = require('../../utils');
const auth = require('../../auth')();
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');

const xml = fs.readFileSync(`${__dirname}/../../forms/repeat-translation.xml`, 'utf8');
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

  const selectorPrefix = '#report-form .active';
  const stateLabelPath = `${selectorPrefix}.question-label[data-itext-id="/repeat_translation/basic/state_1:label"]`;
  const cityLabelPath = `${selectorPrefix}.question-label[data-itext-id="/repeat_translation/basic/rep/city_1:label"]`;
  const melbourneLabelPath = `${selectorPrefix}[data-itext-id="/repeat_translation/basic/rep/city_1/melbourne:label"]`;
  const inputCountPath = `${selectorPrefix}[data-itext-id="/repeat_translation/basic/count:label"] ~ input`;

  it('should display the initial form and its repeated content in Nepali', async () => {
    const neUserName = 'प्रयोगकर्ताको नाम';
    await loginPage.changeLanguage('ne', neUserName);
    await loginPage.login({ username: auth.username, password: auth.password, createUser: true });
    await commonPage.goToBase();
    await commonPage.goToReports();
    await (await reportsPage.submitReportButton()).click();
    await (await reportsPage.formActionsLink(formDocument.internalId)).click();

    const stateLabel = await $(stateLabelPath);
    expect(await stateLabel.getText()).to.equal('Select a state: - NE');
    const inputCount = await $(inputCountPath);
    expect(await inputCount.getValue()).to.equal('1');
    let cityLabels = await $$(cityLabelPath);
    expect(cityLabels.length).to.equal(1);
    let melbourneLabels = await $$(melbourneLabelPath);
    expect(melbourneLabels.length).to.equal(1);

    await inputCount.setValue(3);
    await stateLabel.click(); // trigger a blur event to trigger the enketo form change listener

    cityLabels = await $$(cityLabelPath);
    expect(await inputCount.getValue()).to.equal('3');
    expect(cityLabels.length).to.equal(3);
    await Promise.all(cityLabels.map(
      async cityLabel => expect(await cityLabel.getText()).to.equal('Select a city: - NE'),
    ));
    melbourneLabels = await $$(melbourneLabelPath);
    expect(melbourneLabels.length).to.equal(3);
    await Promise.all(melbourneLabels.map(
      async melbourneLabel => expect(await melbourneLabel.getText()).to.equal('ML (NE)'),
    ));
  });

  it('should display the initial form and its repeated content in English', async () => {
    const enUserName = 'User name';
    await loginPage.changeLanguage('en', enUserName);
    await loginPage.login({ username: auth.username, password: auth.password, createUser: true });
    await commonPage.goToBase();
    await commonPage.goToReports();
    await (await reportsPage.submitReportButton()).click();
    await (await reportsPage.formActionsLink(formDocument.internalId)).click();

    const stateLabel = await $(stateLabelPath);
    expect(await stateLabel.getText()).to.equal('Select a state:');
    const inputCount = await $(inputCountPath);
    expect(await inputCount.getValue()).to.equal('1');
    let cityLabels = await $$(cityLabelPath);
    expect(cityLabels.length).to.equal(1);
    let melbourneLabels = await $$(melbourneLabelPath);
    expect(melbourneLabels.length).to.equal(1);

    await inputCount.setValue(3);
    await stateLabel.click(); // trigger a blur event to trigger the enketo form change listener

    cityLabels = await $$(cityLabelPath);
    expect(await inputCount.getValue()).to.equal('3');
    expect(cityLabels.length).to.equal(3);
    await Promise.all(cityLabels.map(
        async cityLabel => expect(await cityLabel.getText()).to.equal('Select a city:'),
    ));
    melbourneLabels = await $$(melbourneLabelPath);
    expect(melbourneLabels.length).to.equal(3);
    await Promise.all(melbourneLabels.map(
        async melbourneLabel => expect(await melbourneLabel.getText()).to.equal('Melbourne'),
    ));
  });
});
