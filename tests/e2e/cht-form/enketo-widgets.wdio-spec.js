const { getFormTitle } = require('@page-objects/default/enketo/generic-form.wdio.page');
const mockConfig = require('./mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const enketoWidgetsPage = require('@page-objects/default/enketo/enketo-widgets.wdio.page');

describe('cht-form web component - Enketo Widgets', () => {

  it('should render form', async () => {
    const url = await mockConfig.startMockApp('enketo_widgets');
    await browser.url(url);

    const title  = await getFormTitle();
    expect(title).to.eq('Enketo Widgets');

    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.selectMultipleDropdown());
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectMultipleDropdown(), 'checkbox', 'a');
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.selectMultipleDropdown(), 'checkbox', 'c');
    expect(await enketoWidgetsPage.getDropdownValue(await enketoWidgetsPage.selectMultipleDropdown()))
      .to.contain('numberselected');

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
    await enketoWidgetsPage.setPhoneNumber('+40766565656');

    await $('.form-footer').click();
    await genericForm.nextPage();

    await enketoWidgetsPage.selectCountryRadio('usa');
    await enketoWidgetsPage.selectCityRadio('nyc');
    await enketoWidgetsPage.selectNeighborhoodRadio('bronx');
    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.countryDropdown());
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.countryDropdown(), 'radio', 'nl');
    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.cityDropdown());
    expect(await enketoWidgetsPage.getDropdownTotalOptions(await enketoWidgetsPage.cityDropdown()))
      .to.equal(3);
    await enketoWidgetsPage.selectDropdownOptions(await enketoWidgetsPage.cityDropdown(), 'radio', 'dro');
    await enketoWidgetsPage.openDropdown(await enketoWidgetsPage.neighborhoodDropdown());
    expect(await enketoWidgetsPage.getDropdownTotalOptions(await enketoWidgetsPage.neighborhoodDropdown()))
      .to.equal(1);
    await enketoWidgetsPage.selectDropdownOptions(
      await enketoWidgetsPage.neighborhoodDropdown(), 'radio', 'havendr'
    );

    await genericForm.nextPage();
    await enketoWidgetsPage.setPatientName('Eli');
    await enketoWidgetsPage.setPatientUuid('123 456 789');

    expect(await (await enketoWidgetsPage.patientNameErrorLabel()).isExisting()).to.be.true;

    await enketoWidgetsPage.setPatientName('Elias');
    await enketoWidgetsPage.setPatientId('12345');

    expect(await (await enketoWidgetsPage.patientNameErrorLabel()).isExisting()).to.be.false;

    await genericForm.submitForm();

    const data = await $('#submittedData').getText();

    const jsonObj = JSON.parse(data)[0].fields;
    expect(jsonObj.patient_uuid).to.equal('123 456 789');
    expect(jsonObj.patient_id).to.equal('12345');
    expect(jsonObj.patient_name).to.equal('Elias');
    expect(jsonObj.enketo_test_select.select_spinner).to.equal('a c');
    expect(jsonObj.enketo_test_select.select1_spinner).to.equal('d');
    expect(jsonObj.enketo_test_select.phone).to.equal('+40766565656');
    expect(jsonObj.cascading_widgets.group1.country).to.equal('usa');
    expect(jsonObj.cascading_widgets.group1.city).to.equal('nyc');
    expect(jsonObj.cascading_widgets.group1.neighborhood).to.equal('bronx');
    expect(jsonObj.cascading_widgets.group2.country2).to.equal('nl');
    expect(jsonObj.cascading_widgets.group2.city2).to.equal('dro');
    expect(jsonObj.cascading_widgets.group2.neighborhood2).to.equal('havendr');
  });
});
