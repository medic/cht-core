const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const enketoWidgetsPage = require('@page-objects/default/enketo/enketo-widgets.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Enketo Widgets', () => {

  it('should submit the Enketo Widgets form', async () => {
    await mockConfig.loadForm('default', 'test', 'enketo_widgets');

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Enketo Widgets');

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
    await genericForm.nextPage(1, false);
    expect(await enketoWidgetsPage.phoneFieldRequiredMessage().getAttribute('data-i18n'))
      .to.equal('constraint.required');

    // try to move to next page with an invalid phone number
    await commonEnketoPage.setInputValue('Phone Number', '+4076');
    await genericForm.nextPage(1, false);
    expect(await enketoWidgetsPage.phoneFieldConstraintMessage().getAttribute('data-itext-id'))
      .to.equal('/enketo_widgets/enketo_test_select/phone:jr:constraintMsg');

    // finally set a valid phone number and continue
    await commonEnketoPage.setInputValue('Phone Number', '+40766565656');

    await $('.form-footer').click();
    await genericForm.nextPage();

    await commonEnketoPage.selectRadioButton('Country', 'United States');
    await commonEnketoPage.selectRadioButton('City', 'New York City');
    await commonEnketoPage.selectRadioButton('Neighborhood', 'Bronx');
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
    await commonEnketoPage.setInputValue('What is the patient\'s name?', 'Eli');
    await commonEnketoPage.setInputValue('What is the patient\'s uuid?', '123 456 789');

    expect(await (await enketoWidgetsPage.patientNameErrorLabel()).isExisting()).to.be.true;

    await commonEnketoPage.setInputValue('What is the patient\'s name?', 'Elias');
    await commonEnketoPage.setInputValue('What is the patient\'s id?', '12345');

    expect(await (await enketoWidgetsPage.patientNameErrorLabel()).isExisting()).to.be.false;

    const [doc, ...additionalDocs] = await mockConfig.submitForm();
    const jsonObj = doc.fields;

    expect(additionalDocs).to.be.empty;

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

  it('should verify the cancel button', async () => {
    await mockConfig.loadForm('default', 'test', 'enketo_widgets');
    expect(await genericForm.getFormTitle()).to.equal('Enketo Widgets');

    const cancelResult = await browser.executeAsync((resolve) => {
      const myForm = document.getElementById('myform');
      myForm.addEventListener('onCancel', () => resolve('Form Canceled'));
      $('.enketo .cancel').click();
    });
    expect(cancelResult).to.equal('Form Canceled');
  });

});
