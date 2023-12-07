const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/standard/contacts/contacts.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

describe('cht-form web component - Edit an Health Center', () => {

  it('should edit an health center', async () => {
    await mockConfig.loadForm('standard', 'contact', 'health_center-edit');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = {
        health_center: {
          parent: 'PARENT',
          type: '',
          is_name_generated: 'false',
          name: 'Filippo\'s health center test',
          external_id: '123 HC',
          notes: 'Test notes - new health center',
          contact: '',
          geolocation: '',
          meta: {
            created_by: '',
            created_by_person_uuid: 'default_user',
            created_by_place_uuid: ''
          }
        }
      };
    });

    const title = await genericForm.getFormTitle();
    expect(title).to.equal('Edit Health Center');

    const placeInfo = await contactPage.getCurrentPlaceEditFormValues('health_center');
    expect(placeInfo.name).to.equal('Filippo\'s health center test');
    expect(placeInfo.externalId).to.equal('123 HC');
    expect(placeInfo.notes).to.equal('Test notes - new health center');

    await commonEnketoPage.setInputValue('Name of this Health Center', 'Filippo\'s health center test - Edited');
    await commonEnketoPage.setInputValue('External ID', '123 HC - Edited');
    await commonEnketoPage.setTextareaValue('Notes', 'Test notes - new health center - Edited');

    const data = await mockConfig.submitForm();

    expect(data[0].name).to.equal('Filippo\'s health center test - Edited');
    expect(data[0].external_id).to.equal('123 HC - Edited');
    expect(data[0].notes).to.equal('Test notes - new health center - Edited');
    expect(data[0].type).to.equal('health_center');
  });

});
