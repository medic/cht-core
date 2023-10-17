const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const replaceUserForm = require('@page-objects/default/enketo/replace-user.wdio.page');

describe('cht-form web component - Replace User Form', () => {
  it('should submit the replace user form', async () => {
    await mockConfig.startMockApp('default', 'app', 'replace_user');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = { contact: { _id: '12345', role: 'chw' } };
      myForm.user = { phone: '+50689999999' };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Replace User');

    await replaceUserForm.selectAdminCode('1234');
    await genericForm.nextPage();
    await replaceUserForm.selectContactFullName('Replacement User');
    await replaceUserForm.selectContactSex(replaceUserForm.SEX.female);
    await replaceUserForm.selectContactDobUnknown();
    await replaceUserForm.selectContactAgeYears(22);
    await genericForm.nextPage();

    const { phone, contactName } = await replaceUserForm.getWarningMsgDetails();
    expect(phone).to.equal('+50689999999');
    expect(contactName).to.equal('Replacement User');

    const data = await mockConfig.submitForm();
    const jsonObjContact = data[0].fields;
    const jsonObjNewContact = data[1];

    expect(jsonObjContact.patient_id).to.equal('12345');
    expect(jsonObjContact.user_phone).to.equal('+50689999999');
    expect(jsonObjContact.contact_role).to.equal('chw');
    expect(jsonObjContact.new_contact_name).to.equal('Replacement User');
    expect(jsonObjContact.new_contact_phone).to.equal('+50689999999');

    expect(jsonObjNewContact.name).to.equal('Replacement User');
    expect(jsonObjNewContact.sex).to.equal('female');
    expect(jsonObjNewContact.phone).to.equal('+50689999999');
    expect(jsonObjNewContact.role).to.equal('chw');
  });

});
