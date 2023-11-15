const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');

describe('cht-form web component - Edit Person Form', () => {

  it('should edit a person', async () => {
    await mockConfig.loadForm('default', 'contact',  'person-edit');

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = {
        person: {
          parent: 'PARENT',
          type: 'person',
          name: 'Filippo',
          short_name: 'Fili',
          date_of_birth: '2000-09-20',
          date_of_birth_method: '',
          ephemeral_dob: {
            dob_calendar: '2000-09-20',
            dob_method: '',
            dob_approx: '2023-10-11T00:00:00.000-06:00',
            dob_raw: '2000-09-20',
            dob_iso: '2000-09-20'
          },
          sex: 'male',
          phone: '+50689999999',
          phone_alternate: '',
          role: 'chw',
          external_id: '12345',
          notes: 'Test notes',
          user_for_contact: {
            create: 'true'
          },
          meta: {
            created_by: '',
            created_by_person_uuid: 'default_user',
            created_by_place_uuid: ''
          }
        },
        meta: {
          instanceID: 'uuid:c558e232-0951-4ed8-8392-5ed8ac3c81b3'
        }
      };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Edit Person');

    await genericForm.nextPage();

    const personInfo = await contactPage.getCurrentPersonEditFormValues('male', 'chw');
    expect(personInfo.name).to.equal('Filippo');
    expect(personInfo.shortName).to.equal('Fili');
    expect(personInfo.dateOfBirth).to.equal('2000-09-20');
    expect(personInfo.sex).to.equal('true');
    expect(personInfo.phone).to.equal('+50689999999');
    expect(personInfo.role).to.equal('true');
    expect(personInfo.externalId).to.equal('12345');
    expect(personInfo.notes).to.equal('Test notes');

    await (await contactPage.personName()).addValue(' Dog');
    await (await contactPage.phoneField()).setValue('+50688888888');
    await (await contactPage.notes('person')).addValue(' - New note');

    const [doc, ...additionalDocs] = await mockConfig.submitForm();

    expect(additionalDocs).to.be.empty;

    expect(doc.name).to.equal('Filippo Dog');
    expect(doc.date_of_birth).to.equal('2000-09-20');
    expect(doc.sex).to.equal('male');
    expect(doc.phone).to.equal('+50688888888');
    expect(doc.role).to.equal('chw');
    expect(doc.external_id).to.equal('12345');
    expect(doc.notes).to.equal('Test notes - New note');
    expect(doc.type).to.equal('person');
  });

});
