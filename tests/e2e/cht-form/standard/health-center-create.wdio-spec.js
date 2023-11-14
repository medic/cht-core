const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPageDefault = require('@page-objects/default/contacts/contacts.wdio.page');

describe('cht-form web component - Create an Health Center', () => {

  it('should create an health center', async () => {
    await mockConfig.loadForm('standard', 'contact', 'health_center-create');

    const title = await genericForm.getFormTitle();
    expect(title).to.equal('New Health Center');

    await (await contactPageDefault.newPrimaryContactButton()).click();
    await (await contactPageDefault.newPrimaryContactName()).setValue('Filippo');
    await (await contactPageDefault.phoneField()).setValue('+50689888888');
    await (await contactPageDefault.roleField('contact', 'chw')).click();
    await (await contactPageDefault.externalIdField('contact')).setValue('123 contact');
    await (await contactPageDefault.notes('contact')).setValue('Test notes - new contact');
    await contactPageDefault.genericForm.nextPage();
    await (await contactPageDefault.writeNamePlace('health_center')).click();
    await (await contactPageDefault.nameField('health_center')).setValue('Filippo\'s health center test');
    await (await contactPageDefault.externalIdField('health_center')).setValue('123 HC');
    await (await contactPageDefault.notes('health_center')).setValue('Test notes - new health center');

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.health_center.is_name_generated).to.equal('false');
    expect(jsonObj.health_center.name).to.equal('Filippo\'s health center test');
    expect(jsonObj.health_center.external_id).to.equal('123 HC');
    expect(jsonObj.health_center.notes).to.equal('Test notes - new health center');
    expect(jsonObj.health_center.contact).to.equal('NEW');

    expect(jsonObj.contact.name).to.equal('Filippo');
    expect(jsonObj.contact.phone).to.equal('+50689888888');
    expect(jsonObj.contact.role).to.equal('chw');
    expect(jsonObj.contact.external_id).to.equal('123 contact');
    expect(jsonObj.contact.notes).to.equal('Test notes - new contact');

  });

});
