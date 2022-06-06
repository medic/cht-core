//config/default/forms/app/pregnancy_home_visit.xml
const fs = require('fs');

const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const pregnancyVisitForm = require('../../page-objects/forms/pregnancy-visit-form.wdio.page');
const { expect } = require('chai');
const xml = fs.readFileSync(`${__dirname}/../../../config/standard/forms/app/pregnancy_visit.xml`, 'utf8');
const formDocument = {
  _id: 'form:pregnancy-visit',
  internalId: 'Pregnancy visit',
  title: 'Pregnancy Visit',
  type: 'form',
  _attachments: {
    xml: {
      content_type: 'application/octet-stream',
      data: Buffer.from(xml).toString('base64')
    }
  }
};

describe('Pregnancy Visit', () => {
  before(async () => {
    await utils.saveDoc(formDocument);
    await utils.seedTestData(userData.userContactDoc, userData.docs);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('Submit and validate Pregnancy Visit form and keeps the report minified', async () => {
    await reportsPage.openForm('Pregnancy Visit');
    await pregnancyVisitForm.selectPatient('jack');
    await genericForm.nextPage();
    const selectedDangerSigns = await pregnancyVisitForm.selectAllDangerSigns();
    await genericForm.nextPage();
    pregnancyVisitForm.addNotes;
    await genericForm.nextPage();

    await expect(await pregnancyVisitForm.dangerSignLabel().getText()).to.equal('Danger Signs');
    await expect(await pregnancyVisitForm.dangerSignSummary().length).to.equal(selectedDangerSigns + 1);
    await expect(await pregnancyVisitForm.followUpMessage().getText())
      .to.have.string('Please note that Jack has one or more danger signs for a high risk pregnancy');
    await reportsPage.submitForm();

    await genericForm.verifyReport();
  });
});

