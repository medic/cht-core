//config/default/forms/app/pregnancy_home_visit.xml
const fs = require('fs');

const utils = require('../../utils');
const userData = require('../../page-objects/forms/data/user.po.data');
const loginPage = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const reportsPage = require('../../page-objects/reports/reports.wdio.page');
const genericForm = require('../../page-objects/forms/generic-form.wdio.page');
const pregnancyVisitForm = require('../../page-objects/forms/pregnancy-visit-form.wdio.page');
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
    await browser.pause(10000);
    await pregnancyVisitForm.selectPatient('jack');
    await genericForm.nextPage();
    //await pregnancyDangerSignForm.selectVisitedHealthFacility();
    await pregnancyVisitForm.selectDangerSign('d3');
    await genericForm.nextPage();
    pregnancyVisitForm.addNotes;
    await genericForm.nextPage();
    await reportsPage.submitForm();

    await genericForm.verifyReport();
  });
});

