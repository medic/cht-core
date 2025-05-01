const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

const capitalize = word => word.charAt(0).toUpperCase() + word.slice(1);

describe('cht-form web component - Edit Person Form', () => {

  it('should edit a person', async () => {
    const initialPerson = {
      type: 'person',
      name: 'Filippo',
      short_name: 'Fili',
      date_of_birth: '2000-09-20',
      date_of_birth_method: '',
      ephemeral_dob: {
        dob_calendar: '2000-09-20',
        dob_method: '',
        dob_raw: '2000-09-20',
        dob_iso: '2000-09-20'
      },
      sex: 'male',
      phone: '+50689999999',
      phone_alternate: '',
      role: 'chw',
      external_id: '12345',
      notes: 'Test notes',
      contact: null,
      parent: null,
      user_for_contact: {
        create: 'true'
      },
      meta: {
        created_by: '',
        created_by_person_uuid: 'default_user',
        created_by_place_uuid: ''
      }
    };

    await mockConfig.loadForm('default', 'contact', 'person-create');

    const title  = await genericForm.getFormTitle();
    expect(title).to.equal('New Person');

    await commonEnketoPage.setInputValue('Full name', initialPerson.name);
    await commonEnketoPage.setInputValue('Short name', initialPerson.short_name);
    await commonEnketoPage.setInputValue('Phone Number', initialPerson.phone);
    await commonEnketoPage.selectRadioButton('Sex', capitalize(initialPerson.sex));
    await commonEnketoPage.setDateValue('Age', initialPerson.date_of_birth);
    await commonEnketoPage.selectRadioButton('Role', initialPerson.role.toUpperCase());
    await commonEnketoPage.setInputValue('External ID', initialPerson.external_id);
    await commonEnketoPage.setTextareaValue('Notes', initialPerson.notes);

    const [doc, ...additionalDocs] = await mockConfig.submitForm();

    expect(additionalDocs).to.be.empty;
    expect(doc).excludingEvery(['_id', 'dob_approx', 'reported_date']).to.deep.equal(initialPerson);

    await mockConfig.cancelForm();

    const updatedPerson = {
      type: 'person',
      name: 'Oppilif',
      short_name: 'Ilif',
      date_of_birth: '2001-09-20',
      date_of_birth_method: '',
      ephemeral_dob: {
        dob_calendar: '2001-09-20',
        dob_method: '',
        dob_raw: '2001-09-20',
        dob_iso: '2001-09-20'
      },
      sex: 'female',
      phone: '+254712345678',
      phone_alternate: '',
      role: 'patient',
      external_id: '54321',
      notes: 'Updated notes',
      contact: null,
      parent: '',
      meta: {
        ...initialPerson.meta,
        last_edited_by: '',
        last_edited_by_person_uuid: 'default_user',
        last_edited_by_place_uuid: ''
      },
    };

    await mockConfig.loadForm('default', 'contact',  'person-edit');
    await browser.execute((initialPerson) => {
      const myForm = document.getElementById('myform');
      myForm.content = {
        person: initialPerson
      };
    }, initialPerson);

    const updatedTitle = await genericForm.getFormTitle();
    expect(updatedTitle).to.equal('Edit Person');

    await genericForm.nextPage();

    const personInfo = await contactPage.getCurrentPersonEditFormValues(
      capitalize(initialPerson.sex),
      initialPerson.role.toUpperCase()
    );
    expect(personInfo.name).to.equal(initialPerson.name);
    expect(personInfo.shortName).to.equal(initialPerson.short_name);
    expect(personInfo.dateOfBirth).to.equal(initialPerson.date_of_birth);
    expect(personInfo.sex).to.equal('true');
    expect(personInfo.phone).to.equal(initialPerson.phone);
    expect(personInfo.role).to.equal('true');
    expect(personInfo.externalId).to.equal(initialPerson.external_id);
    expect(personInfo.notes).to.equal(initialPerson.notes);

    await commonEnketoPage.setInputValue('Full name', updatedPerson.name);
    await commonEnketoPage.setInputValue('Short name', updatedPerson.short_name);
    await commonEnketoPage.setInputValue('Phone Number', updatedPerson.phone);
    await commonEnketoPage.selectRadioButton( 'Sex', capitalize(updatedPerson.sex));
    await commonEnketoPage.setDateValue('Age', updatedPerson.date_of_birth);
    await commonEnketoPage.selectRadioButton('Role', capitalize(updatedPerson.role));
    await commonEnketoPage.setInputValue('External ID', updatedPerson.external_id);
    await commonEnketoPage.setTextareaValue('Notes', updatedPerson.notes);

    const [updatedDoc, ...updatedAdditionalDocs] = await mockConfig.submitForm();

    expect(updatedAdditionalDocs).to.be.empty;
    expect(updatedDoc).excludingEvery(['_id', 'dob_approx', 'reported_date']).to.deep.equal(updatedPerson);
  });
});
