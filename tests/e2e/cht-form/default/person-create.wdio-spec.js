const mockConfig = require('../mock-config');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Create Person Form', () => {

  it('should create a new person', async () => {
    await mockConfig.loadForm('default', 'contact', 'person-create');

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('New Person');

    await (await contactPage.nameField('person')).setValue('Filippo');
    await (await contactPage.sexField('person', 'male')).click();
    await (await contactPage.phoneField()).setValue('+50689999999');
    await (await contactPage.dateOfBirthField()).setValue('2000-09-20');
    await (await contactPage.roleField('person', 'chw')).click();
    await (await contactPage.externalIdField('person')).setValue('12345');
    await (await contactPage.notes('person')).setValue('Test notes - create new person');

    const [doc, ...additionalDocs] = await mockConfig.submitForm();

    expect(additionalDocs).to.be.empty;

    expect(doc.name).to.equal('Filippo');
    expect(doc.date_of_birth).to.equal('2000-09-20');
    expect(doc.sex).to.equal('male');
    expect(doc.phone).to.equal('+50689999999');
    expect(doc.role).to.equal('chw');
    expect(doc.external_id).to.equal('12345');
    expect(doc.notes).to.equal('Test notes - create new person');
    expect(doc.type).to.equal('person');
  });

});

