const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Create Person Form', () => {

  it('should create a new person', async () => {
    await mockConfig.loadForm('default', 'contact', 'person-create');

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('New Person');

    await commonEnketoPage.setInputValue('Full name', 'Filippo');
    await commonEnketoPage.setInputValue('Phone Number', '+50689999999');
    await commonEnketoPage.selectRadioButton('Sex', 'Male');
    await commonEnketoPage.setDateValue('Age', '2000-09-20');
    await commonEnketoPage.selectRadioButton('Role', 'CHW');
    await commonEnketoPage.setInputValue('External ID', '12345');
    await commonEnketoPage.setTextareaValue('Notes', 'Test notes - create new person');

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

