const mockConfig = require('../mock-config');
const {getFormTitle} = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Create and Edit Person Form', () => {
  let fieldsDataNewPerson;

  it('should create a new person', async () => {
    const url = await mockConfig.startMockApp('default', 'person_create');
    await browser.url(url);

    const title  = await getFormTitle();
    expect(title).to.equal('New Person');

    await (await contactPage.personName()).setValue('Filippo');
    await (await contactPage.sexField('person', 'male')).click();
    await (await contactPage.phoneField()).setValue('+50689999999');
    await (await contactPage.dateOfBirthField()).setValue('2000-09-20');
    await (await contactPage.roleField('person', 'chw')).click();
    await (await contactPage.externalIdField('person')).setValue('12345');
    await (await contactPage.notes('person')).setValue('Test notes - create new person');
    await genericForm.submitForm();

    const data = await $('#submittedData').getText();
    fieldsDataNewPerson = JSON.parse(data)[0].fields;

    expect(fieldsDataNewPerson.person.name).to.equal('Filippo');
    expect(fieldsDataNewPerson.person.date_of_birth).to.equal('2000-09-20');
    expect(fieldsDataNewPerson.person.sex).to.equal('male');
    expect(fieldsDataNewPerson.person.phone).to.equal('+50689999999');
    expect(fieldsDataNewPerson.person.role).to.equal('chw');
    expect(fieldsDataNewPerson.person.external_id).to.equal('12345');
    expect(fieldsDataNewPerson.person.notes).to.equal('Test notes - create new person');
  });

  // eslint-disable-next-line no-only-tests/no-only-tests
  it.skip('should edit a person', async () => {
    console.log('-------- IT #2 ----------');
    const url = await mockConfig.startMockApp('default', 'person_edit');
    await browser.url(url);

    /*const test = {
      fields: {
        inputs: {
          meta: {
            location: {
              lat: '',
              long: '',
              error: '',
              message: ''
            },
            deprecatedID: ''
          },
          user: {
            contact_id: 'default_user',
            facility_id: '',
            name: ''
          }
        },
        person: {
          parent: 'PARENT',
          type: 'person',
          name: 'Filippo',
          short_name: '',
          date_of_birth: '2000-09-20',
          date_of_birth_method: '',
          ephemeral_dob: {
            dob_calendar: '2000-09-20',
            dob_method: '',
            dob_approx: '2023-10-06T00:00:00.000-06:00',
            dob_raw: '2000-09-20',
            dob_iso: '2000-09-20'
          },
          sex: 'male',
          phone: '+50689999999',
          phone_alternate: '',
          role: 'chw',
          external_id: '12345',
          notes: 'Test notes - create new person',
          user_for_contact: {
            create: 'true'
          },
          meta: {
            created_by: '',
            created_by_person_uuid: 'default_user',
            created_by_place_uuid: ''
          }
        }}
    };*/

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      //myForm.content = test;
      myForm.content = {
        fields: {
          inputs: {
            /*meta: {
              location: {
                lat: '',
                long: '',
                error: '',
                message: ''
              },
              deprecatedID: ''
            },*/
            user: {
              contact_id: 'default_user',
              facility_id: '',
              name: ''
            }
          },
          person: {
            parent: 'PARENT',
            type: 'person',
            name: 'Filippo',
            short_name: '',
            date_of_birth: '2000-09-20',
            date_of_birth_method: '',
            ephemeral_dob: {
              dob_calendar: '2000-09-20',
              dob_method: '',
              dob_approx: '2023-10-06T00:00:00.000-06:00',
              dob_raw: '2000-09-20',
              dob_iso: '2000-09-20'
            },
            sex: 'male',
            phone: '+50689999999',
            phone_alternate: '',
            role: 'chw',
            external_id: '12345',
            notes: 'Test notes - create new person',
            user_for_contact: {
              create: 'true'
            },
            meta: {
              created_by: '',
              created_by_person_uuid: 'default_user',
              created_by_place_uuid: ''
            }
          }}
      };
    });

    const title  = await getFormTitle();
    expect(title).to.equal('Edit Person');

    await genericForm.nextPage();

    await browser.pause(5000);
  });
});
