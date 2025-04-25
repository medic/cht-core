const commonPage = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const personFactory = require('@factories/cht/contacts/person');
const { expect } = require('chai');

describe('Phone widget', () => {
  const phone = '+254712345678';
  const person0 = personFactory.build({ phone });
  const person1 = personFactory.build({ phone: '+254712345679'  });

  before(async () => {
    await utils.saveDocIfNotExists(commonPage.createFormDoc(`${__dirname}/forms/phone_widget`));
    await utils.saveDocs([person0, person1]);
    await loginPage.cookieLogin();
    await commonPage.hideSnackbar();
  });

  after(async () => {
    await utils.deleteDocs(['form:phone_widget']);
    await utils.revertDb([/^form:/], true);
  });

  // Only testing the duplicate checking logic here.
  // The rest of the phone widget logic is covered by the cht-form integration tests

  it('duplicate phone numbers violate constraint when configured in app form', async () => {
    await commonPage.goToReports();

    await commonPage.openFastActionReport('phone_widget', false);

    await commonEnketoPage.setInputValue('Deprecated Phone', phone);
    await commonEnketoPage.setInputValue('Phone – allow duplicates', phone);
    await commonEnketoPage.setInputValue('Phone – unique', phone);

    expect(await commonEnketoPage.isConstraintMessageDisplayed('Deprecated Phone')).to.be.true;
    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone – allow duplicates')).to.be.false;
    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone – unique')).to.be.true;

    await commonEnketoPage.setInputValue('Deprecated Phone', '+254712345671');
    await commonEnketoPage.setInputValue('Phone – unique', '+254712345674');

    expect(await commonEnketoPage.isConstraintMessageDisplayed('Deprecated Phone')).to.be.false;
    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone – unique')).to.be.false;

    await genericForm.submitForm();

    const reportId = await reportsPage.getCurrentReportId();
    const { fields } = await utils.getDoc(reportId);
    expect(fields).excluding(['meta']).to.deep.equal({
      phone_widgets: {
        deprecated_phone: '+254712345671',
        phone,
        phone_unique: '+254712345674',
      }
    });
  });

  it('can use duplicate phone number when editing contact with same number', async () => {
    await commonPage.goToPeople(person1._id);
    await commonPage.accessEditOption();

    await genericForm.nextPage();
    // Try setting phone to number of the other person
    await commonEnketoPage.setInputValue('Phone Number', person0.phone);

    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone Number')).to.be.true;

    // Reset phone back to original value for this person
    await commonEnketoPage.setInputValue('Phone Number', person1.phone);

    expect(await commonEnketoPage.isConstraintMessageDisplayed('Phone Number')).to.be.false;

    await genericForm.submitForm();

    const editedPerson = await utils.getDoc(person1._id);
    expect(editedPerson.phone).to.equal(person1.phone);
  });
});
