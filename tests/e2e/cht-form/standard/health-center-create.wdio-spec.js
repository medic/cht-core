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
    await (await contactPageDefault.customPlaceNameField()).setValue('Filippo\'s health center test');
    await (await contactPageDefault.externalIdField('health_center')).setValue('123 HC');
    await (await contactPageDefault.notes('health_center')).setValue('Test notes - new health center');

    const data = await mockConfig.submitForm();

    expect(data[0].is_name_generated).to.equal('false');
    expect(data[0].name).to.equal('Filippo\'s health center test');
    expect(data[0].external_id).to.equal('123 HC');
    expect(data[0].notes).to.equal('Test notes - new health center');
    expect(data[0].contact._id).to.equal(data[1]._id);
    expect(data[0].type).to.equal('health_center');

    expect(data[1].name).to.equal('Filippo');
    expect(data[1].phone).to.equal('+50689888888');
    expect(data[1].role).to.equal('chw');
    expect(data[1].external_id).to.equal('123 contact');
    expect(data[1].notes).to.equal('Test notes - new contact');
    expect(data[1].type).to.equal('person');

  });

});
