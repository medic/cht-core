const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Edit Person Form', () => {

  it('should edit a person', async () => {
    const url = await mockConfig.startMockApp('default', 'person_edit');
    await browser.url(url);

    await browser.execute(() => {
      const myForm = document.getElementById('myform');
      myForm.content = {
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
          init: {
            parent_id: 'PARENT',
            name: '',
            type: '',
            type_selector: '',
            type_label: ''
          },
          meta: {
            instanceID: 'uuid:c558e232-0951-4ed8-8392-5ed8ac3c81b3'
          }
        }
      };
    });

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('Edit Person');

    await genericForm.nextPage();

    await browser.pause(5000);
  });
});
