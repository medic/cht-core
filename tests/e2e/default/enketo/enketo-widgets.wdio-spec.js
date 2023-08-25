const fs = require('fs');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const enketoWidgetsPage = require('@page-objects/default/enketo/enketo-widgets.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');


describe('Enketo Widgets', () => {
  const districtHospital = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });
  const offlineUser = userFactory.build({ place: districtHospital._id, roles: ['chw'] });
  const formDoc = {
    _id: 'form:enketo_widgets_test',
    internalId: 'enketo_widgets_test',
    title: 'Enketo Widgets Test',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer
          .from(fs.readFileSync(`${__dirname}/forms/enketo_widgets.xml`, 'utf8'))
          .toString('base64'),
      },
    },
  };

  before(async () => {
    await utils.saveDoc(formDoc);
    await utils.saveDocs([districtHospital]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
  });

  it('should submit Enketo Widgets form', async () => {
    await commonPage.goToPeople(offlineUser.contact._id);
    await commonPage.openFastActionReport('enketo_widgets_test');
    await commonPage.waitForPageLoaded();
    expect(await enketoWidgetsPage.getFormTitle()).to.equal('Enketo Widgets Test');

    await genericForm.nextPage();
    await enketoWidgetsPage.selectCountryRadio();
    await enketoWidgetsPage.selectCityRadio();
    await enketoWidgetsPage.selectNeighborhoodRadio();
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    expect(firstReportInfo.heading).to.equal(offlineUser.contact.name);
    expect(firstReportInfo.form).to.equal('Enketo Widgets Test');

    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();

    const { senderName, senderPhone, reportName } = await reportsPage.getOpenReportInfo();
    expect(senderName).to.equal(`${offlineUser.contact.name} `);
    expect(senderPhone).to.equal(offlineUser.contact.phone);
    expect(reportName).to.equal('Enketo Widgets Test');

    expect((await reportsPage.getDetailReportRowContent('group1.country')).rowValues[0]).to.equal('nl');
    expect((await reportsPage.getDetailReportRowContent('group1.city')).rowValues[0]).to.equal('rot');
    expect((await reportsPage.getDetailReportRowContent('group1.neighborhood')).rowValues[0]).to.equal('centrum');
  });

});
