const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Create an Health Center', () => {

  it('should create an health center', async () => {
    await mockConfig.loadForm('standard', 'contact', 'health_center-create');

    const title = await genericForm.getFormTitle();
    expect(title).to.equal('New Health Center');

    await commonEnketoPage.selectRadioButton('Set the Primary Contact', 'Create a new person');
    await commonEnketoPage.setInputValue('Names', 'Filippo');
    await commonEnketoPage.setInputValue('Phone Number', '+50689888888');
    await commonEnketoPage.selectRadioButton('Role', 'CHW');
    await commonEnketoPage.setInputValue('External ID', '123 contact');
    await commonEnketoPage.setTextareaValue('Notes', 'Test notes - new contact');
    await genericForm.nextPage();
    await commonEnketoPage.selectRadioButton('Would you like to name the place after the primary contact:',
      'No, I want to name it manually');
    await commonEnketoPage.setInputValue('Name of this Health Center', 'Filippo\'s health center test');
    await commonEnketoPage.setInputValue('External ID', '123 HC');
    await commonEnketoPage.setTextareaValue('Notes', 'Test notes - new health center');

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
