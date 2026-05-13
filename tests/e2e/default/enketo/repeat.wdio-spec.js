const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const hierarchyFactory = require('@factories/cht/generate');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('RepeatForm', () => {
  const hierarchy = hierarchyFactory.createHierarchy({ name: 'test', user: true, nbrClinics: 1, nbrPersons: 1 });

  const assertLabels = async ({ selector, count, labelText }) => {
    const labels = await $$(selector);
    expect(labels.length).to.equal(count);
    for (const label of labels) {
      expect(await label.getText()).to.equal(labelText);
    }
  };

  const openRepeatForm = async (formId) => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport(formId, false);
  };

  before(async () => {
    await utils.saveDocs(hierarchy.places);
    await utils.createUsers([hierarchy.user]);
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/repeat-translation-count`));
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/repeat-translation-button`));
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/repeat-translation-select`));
  });

  afterEach(async () => {
    await browser.deleteCookies();
    await browser.refresh();
  });

  const selectorPrefix = '#report-form .active';
  const cityLabelPath = `${selectorPrefix}.question-label[data-itext-id="/data/basic/rep/city_1:label"]`;
  const melbourneLabelPath = `${selectorPrefix}[data-option-value="melbourne"]`;

  describe('Repeat form with count input', () => {

    it('should display the initial form and its repeated content in Nepali', async () => {
      await browser.url('/');
      const neUserName = 'प्रयोगकर्ताको नाम';
      await loginPage.changeLanguage('ne', neUserName);
      await loginPage.login({ username: hierarchy.user.username, password: hierarchy.user.password, locale: 'ne' });
      await openRepeatForm('repeat-translation-count');

      expect(await commonEnketoPage.isElementDisplayed('span', 'Select a state: - NE')).to.be.true;
      expect(await commonEnketoPage.getInputValue('How many? NE')).to.equal('1');

      await assertLabels({ selector: cityLabelPath, count: 1, labelText: 'Select a city: - NE' });
      await assertLabels({ selector: melbourneLabelPath, count: 1, labelText: 'ML (NE)' });

      await commonEnketoPage.setInputValue('How many? NE', 3);
      await genericForm.formTitle().click();

      await assertLabels({ selector: cityLabelPath, count: 3, labelText: 'Select a city: - NE' });
      await assertLabels({ selector: melbourneLabelPath, count: 3, labelText: 'ML (NE)' });
    });

    it('should display the initial form and its repeated content in English', async () => {
      const enUserName = 'User name';
      await loginPage.changeLanguage('en', enUserName);
      await loginPage.login({ username: hierarchy.user.username, password: hierarchy.user.password, locale: 'en' });
      await openRepeatForm('repeat-translation-count');

      expect(await commonEnketoPage.isElementDisplayed('span', 'Select a state:')).to.be.true;
      expect(await commonEnketoPage.getInputValue('How many? NE')).to.equal('1');

      await assertLabels({ selector: cityLabelPath, count: 1, labelText: 'Select a city:' });
      await assertLabels({ selector: melbourneLabelPath, count: 1, labelText: 'Melbourne' });

      await commonEnketoPage.setInputValue('How many? NE', 3);
      await genericForm.formTitle().click();

      await assertLabels({ selector: cityLabelPath, count: 3, labelText: 'Select a city:' });
      await assertLabels({ selector: melbourneLabelPath, count: 3, labelText: 'Melbourne' });
    });
  });

  describe('Repeat form with repeat button', () => {
    const repeatForm = async () => {
      const addRepeatButton = await $('.btn.btn-default.add-repeat-btn');
      await addRepeatButton.click();
    };

    it('should display the initial form and its repeated content in Swahili', async () => {
      await browser.url('/');
      const swUserName = 'Jina la mtumizi';
      await loginPage.changeLanguage('sw', swUserName);
      await loginPage.login({ username: hierarchy.user.username, password: hierarchy.user.password, locale: 'sw' });
      await openRepeatForm('repeat-translation-button');

      expect(await commonEnketoPage.isElementDisplayed('span', 'Select a state: - SV')).to.be.true;
      await assertLabels({ selector: cityLabelPath, count: 0, labelText: 'Select a city: - SV' });
      await assertLabels({ selector: melbourneLabelPath, count: 0, labelText: 'ML (SV)' });

      await repeatForm();
      await repeatForm();
      await repeatForm();

      await assertLabels({ selector: cityLabelPath, count: 3, labelText: 'Select a city: - SV' });
      await assertLabels({ selector: melbourneLabelPath, count: 3, labelText: 'ML (SV)' });

      // Submit form and verify repeat fields are saved to the document
      await commonEnketoPage.selectRadioButton('Select a state: - SV', 'VIC (SV)');
      await commonEnketoPage.selectRadioButton('Select a city: - SV', 'ML (SV)');
      await genericForm.submitForm();

      const reportId = await reportsPage.getCurrentReportId();
      const report = await utils.getDoc(reportId);
      expect(report.fields.basic.state_1).to.equal('VIC');
      expect(report.fields.basic.rep.length).to.equal(3);
      expect(report.fields.basic.rep[0].city_1).to.equal('melbourne');
    });

    it('should display the initial form and its repeated content in English', async () => {
      const enUserName = 'User name';
      await loginPage.changeLanguage('en', enUserName);
      await loginPage.login({ username: hierarchy.user.username, password: hierarchy.user.password, locale: 'en' });
      await openRepeatForm('repeat-translation-button');

      expect(await commonEnketoPage.isElementDisplayed('span', 'Select a state:')).to.be.true;

      await assertLabels({ selector: cityLabelPath, count: 0, labelText: 'Select a city:' });
      await assertLabels({ selector: melbourneLabelPath, count: 0, labelText: 'Melbourne' });

      await repeatForm();
      await repeatForm();
      await repeatForm();

      await assertLabels({ selector: cityLabelPath, count: 3, labelText: 'Select a city:' });
      await assertLabels({ selector: melbourneLabelPath, count: 3, labelText: 'Melbourne' });

      // Submit form and verify repeat fields are saved to the document
      await commonEnketoPage.selectRadioButton('Select a state:', 'Victoria');
      await commonEnketoPage.selectRadioButton('Select a city:', 'Melbourne');
      await genericForm.submitForm();

      const reportId = await reportsPage.getCurrentReportId();
      const report = await utils.getDoc(reportId);
      expect(report.fields.basic.state_1).to.equal('VIC');
      expect(report.fields.basic.rep.length).to.equal(3);
      expect(report.fields.basic.rep[0].city_1).to.equal('melbourne');
    });
  });

  describe('Repeat form with select', () => {
    it('should display the initial form and its repeated content in the default language', async () => {
      await browser.url('/');
      const swUserName = 'Jina la mtumizi';
      await loginPage.changeLanguage('sw', swUserName);
      await loginPage.login({ username: hierarchy.user.username, password: hierarchy.user.password, locale: 'sw' });
      await openRepeatForm('repeat-translation-select');

      expect(await commonEnketoPage.isElementDisplayed('label', 'Washington')).to.be.true;
      expect(await commonEnketoPage.isElementDisplayed('label', 'Texas')).to.be.true;
      await commonEnketoPage.selectRadioButton('Select a state', 'Washington');

      expect(await commonEnketoPage.isElementDisplayed('label', 'King')).to.be.true;
      expect(await commonEnketoPage.isElementDisplayed('label', 'Pierce')).to.be.true;
      await commonEnketoPage.selectRadioButton('Select a county', 'King');

      expect(await commonEnketoPage.isElementDisplayed('label', 'Seattle')).to.be.true;
      expect(await commonEnketoPage.isElementDisplayed('label', 'Redmond')).to.be.true;
    });
  });
});
