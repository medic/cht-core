const fs = require('fs');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const enketoWidgetsPage = require('@page-objects/default/enketo/enketo-widgets.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');


describe('Enketo Widgets', () => {
  const districtHospital = placeFactory.place().build({ _id: 'dist1', type: 'district_hospital' });
  const phoneNumber = '+40766565656';
  const offlineUser = userFactory.build({
    place: districtHospital._id,
    roles: ['chw'],
    //The "name" value is deliberately <4 characters to violate the inputs constraint in the form
    contact: {_id: '987 654 321', name: 'Ben', phone: '+50689999999'}
  });
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

  let medicId;

  const fillCascadingWidgetsSection = async (country, city, neighborhood, countCities, countNeighborhood) => {
    await enketoWidgetsPage.selectCountryRadio(country);
    await enketoWidgetsPage.selectCityRadio(city);
    await enketoWidgetsPage.selectNeighborhoodRadio(neighborhood);
    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.countryDropdown());
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.countryDropdown(), 'radio', country);
    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.cityDropdown());
    expect(await enketoWidgetsPage.getDropdownTotalOptions(await enketoWidgetsPage.cityDropdown()))
      .to.equal(countCities);
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.cityDropdown(), 'radio', city);
    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.neighborhoodDropdown());
    expect(await enketoWidgetsPage.getDropdownTotalOptions(await enketoWidgetsPage.neighborhoodDropdown()))
      .to.equal(countNeighborhood);
    await enketoWidgetsPage.selectDropdownOptions(
      await enketoWidgetsPage.neighborhoodDropdown(), 'radio', neighborhood
    );
  };

  const verifyReport = async (selectMultiple, selectOne, country, city, neighborhood, uuid, id, name, phoneNumber) => {
    const firstReport = await reportsPage.firstReport();
    const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

    expect(firstReportInfo.heading).to.equal(name);
    expect(firstReportInfo.form).to.equal('Enketo Widgets Test');

    await reportsPage.openSelectedReport(firstReport);
    await commonPage.waitForPageLoaded();

    const { senderName, senderPhone, reportName } = await reportsPage.getOpenReportInfo();
    expect(senderName).to.equal(`Submitted by ${offlineUser.contact.name} `);
    expect(senderPhone).to.equal(offlineUser.contact.phone);
    expect(reportName).to.equal('Enketo Widgets Test');

    expect((await reportsPage.getDetailReportRowContent('select_spinner')).rowValues[0]).to.equal(selectMultiple);
    expect((await reportsPage.getDetailReportRowContent('select1_spinner')).rowValues[0]).to.equal(selectOne);
    expect((await reportsPage.getDetailReportRowContent('country')).rowValues[0]).to.equal(country);
    expect((await reportsPage.getDetailReportRowContent('city')).rowValues[0]).to.equal(city);
    expect((await reportsPage.getDetailReportRowContent('neighborhood')).rowValues[0]).to.equal(neighborhood);
    expect((await reportsPage.getDetailReportRowContent('country2')).rowValues[0]).to.equal(country);
    expect((await reportsPage.getDetailReportRowContent('city2')).rowValues[0]).to.equal(city);
    expect((await reportsPage.getDetailReportRowContent('neighborhood2')).rowValues[0]).to.equal(neighborhood);
    expect((await reportsPage.getDetailReportRowContent('patient_uuid')).rowValues[0]).to.equal(uuid);
    expect((await reportsPage.getDetailReportRowContent('patient_id')).rowValues[0]).to.equal(id);
    expect((await reportsPage.getDetailReportRowContent('patient_name')).rowValues[0]).to.equal(name);
    expect((await reportsPage.getDetailReportRowContent('phone')).rowValues[0]).to.equal(phoneNumber);
  };

  before(async () => {
    await utils.saveDocs([formDoc, districtHospital]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
    await commonPage.waitForPageLoaded();
  });

  it('should submit Enketo Widgets form - People\'s tab', async () => {
    await commonPage.goToPeople(offlineUser.contact._id);
    medicId = await contactPage.getContactMedicID();
    await commonPage.openFastActionReport('enketo_widgets_test');
    await commonPage.waitForPageLoaded();
    expect(await enketoWidgetsPage.getFormTitle()).to.equal('Enketo Widgets Test');

    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.selectMultipleDropdown());
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectMultipleDropdown(), 'checkbox', 'a');
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectMultipleDropdown(), 'checkbox', 'c');
    expect(await enketoWidgetsPage.getDropdownValue(await enketoWidgetsPage.selectMultipleDropdown()))
      .to.equal('2 selected');

    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.selectOneDropdown());
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectOneDropdown(), 'radio', 'd');
    expect(await enketoWidgetsPage.getDropdownValue(await enketoWidgetsPage.selectOneDropdown()))
      .to.equal('option d');

    // try to move to next page without filling the mandatory phone number field
    await genericForm.nextPage();
    expect(await enketoWidgetsPage.phoneFieldRequiredMessage().getAttribute('data-i18n'))
      .to.equal('constraint.required');

    // try to move to next page with an invalid phone number
    await enketoWidgetsPage.setPhoneNumber('+4076');
    await genericForm.nextPage();
    expect(await enketoWidgetsPage.phoneFieldConstraintMessage().getAttribute('data-itext-id'))
      .to.equal('/enketo_widgets/enketo_test_select/phone:jr:constraintMsg');

    // finally set a valid phone number and continue
    await enketoWidgetsPage.setPhoneNumber(phoneNumber);

    await genericForm.nextPage();
    await fillCascadingWidgetsSection('usa', 'nyc', 'bronx', 3, 2);
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await verifyReport(
      'a c',
      'd',
      'usa',
      'nyc',
      'bronx',
      offlineUser.contact._id,
      medicId,
      offlineUser.contact.name,
      phoneNumber,
    );
  });

  it('should submit Enketo Widgets form - Report\'s tab', async () => {
    await commonPage.goToReports();
    await commonPage.openFastActionReport('enketo_widgets_test', false);
    await commonPage.waitForPageLoaded();
    expect(await enketoWidgetsPage.getFormTitle()).to.equal('Enketo Widgets Test');

    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.selectMultipleDropdown());
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectMultipleDropdown(), 'checkbox', 'b');
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectMultipleDropdown(), 'checkbox', 'c');
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectMultipleDropdown(), 'checkbox', 'd');
    expect(await enketoWidgetsPage.getDropdownValue(await enketoWidgetsPage.selectMultipleDropdown()))
      .to.equal('3 selected');

    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.selectOneDropdown());
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectOneDropdown(), 'radio', 'a');
    expect(await enketoWidgetsPage.getDropdownValue(await enketoWidgetsPage.selectOneDropdown()))
      .to.equal('option a');
    await enketoWidgetsPage.setPhoneNumber(phoneNumber);

    await genericForm.nextPage();
    await fillCascadingWidgetsSection('nl', 'dro', 'havendr', 3, 1);
    await genericForm.nextPage();
    await enketoWidgetsPage.setPatientName('Eli');
    await enketoWidgetsPage.setPatientUuid('123 456 789');

    expect(await (await enketoWidgetsPage.patientNameErrorLabel()).isExisting()).to.be.true;

    await enketoWidgetsPage.setPatientName('Elias');
    await enketoWidgetsPage.setPatientId('12345');

    expect(await (await enketoWidgetsPage.patientNameErrorLabel()).isExisting()).to.be.false;

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();

    await commonPage.goToReports();
    await verifyReport(
      'b c d',
      'a',
      'nl',
      'dro',
      'havendr',
      '123 456 789',
      '12345',
      'Elias',
      phoneNumber,
    );
  });

});
