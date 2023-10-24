const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/standard/contacts/contacts.wdio.page');

describe('cht-form web component - Edit an Health Center', () => {

  it('should edit an health center', async () => {
    await mockConfig.startMockApp('standard', 'contact', 'health_center-edit');

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

    await (await contactPage.contactPageDefault.nameField('health_center')).addValue(' - Edited');
    await (await contactPage.contactPageDefault.externalIdField('health_center')).addValue(' - Edited');
    await (await contactPage.contactPageDefault.notes('health_center')).addValue(' - Edited');

    const data = await mockConfig.submitForm();
    const jsonObj = data[0].fields;

    expect(jsonObj.health_center.name).to.equal('Filippo\'s health center test - Edited');
    expect(jsonObj.health_center.external_id).to.equal('123 HC - Edited');
    expect(jsonObj.health_center.notes).to.equal('Test notes - new health center - Edited');

  });

});
