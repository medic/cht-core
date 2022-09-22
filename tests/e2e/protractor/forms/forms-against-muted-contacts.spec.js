const { expect } = require('chai');

const utils = require('../../../utils');
const homeVisit = require('../../../page-objects/protractor/enketo/home-visit.po');
const unmutePerson = require('../../../page-objects/protractor/enketo/unmute-person.po');
const contactsObjects = require('../../../page-objects/protractor/contacts/contacts.po');
const genericContactForm = require('../../../page-objects/protractor/enketo/generic-contact-form.po');
const commonElements = require('../../../page-objects/protractor/common/common.po');

const clinic = {
  _id: 'clinic',
  name: 'clinic',
  type: 'clinic',
  reported_date: new Date().getTime(),
};

const patient1 = {
  _id: 'patient1',
  name: 'patient one',
  type: 'person',
  patient_id: 'patient1',
  parent: { _id: 'clinic' },
  muted: new Date(),
  reported_date: new Date().getTime(),
};

const patient2 = {
  _id: 'patient2',
  name: 'patient two',
  type: 'person',
  patient_id: 'patient2',
  parent: { _id: 'clinic' },
  reported_date: new Date().getTime(),
};

const getLastSubmittedReport = async () => {
  const opts = { include_docs: true, limit: 1, descending: true };
  const result = await utils.db.query('medic-client/reports_by_date', opts);

  return result.rows[0].doc;
};

const expectForm = async (patient, form) => {
  expect(await getLastSubmittedReport()).to.deep.nested.include({
    form: form,
    'fields.patient_id': patient.patient_id,
    'fields.patient_uuid': patient._id,
  });
};

const settings = {
  muting: {
    unmute_forms: [unmutePerson.formId],
  }
};

const contacts = [clinic, patient1, patient2];

describe('Submitting forms for muted contacts', () => {
  beforeEach(async () => {
    await utils.saveDocs(contacts);
    await homeVisit.configureForm();
    await unmutePerson.configureForm();

    await commonElements.goToPeople();
    await utils.updateSettings(settings);
  });

  afterEach(async () => await utils.revertDb());

  it('should not show popup for unmuted persons', async () => {
    await contactsObjects.selectLHSRowByText(patient2.name);
    await genericContactForm.openForm(homeVisit.formId);
    await genericContactForm.submit();
    await expectForm(patient2, homeVisit.formId);

    await contactsObjects.selectLHSRowByText(patient2.name);
    await genericContactForm.openForm(unmutePerson.formId);
    await genericContactForm.submit();
    await expectForm(patient2, unmutePerson.formId);
  });

  it('should show a popup when trying to submit a non-unmuting form against a muted contact', async () => {
    await contactsObjects.selectLHSRowByText(patient1.name);
    // popup is shown
    await genericContactForm.openFormForMutedContact(homeVisit.formId);
    await genericContactForm.closeModal(false);
    // we should still be on the contact page
    expect(await contactsObjects.contactName.getText()).to.equal(patient1.name);

    await genericContactForm.openFormForMutedContact(homeVisit.formId);
    await genericContactForm.closeModal(true);
    await genericContactForm.submit();
    await expectForm(patient1, homeVisit.formId);

    await contactsObjects.selectLHSRowByText(patient1.name);
    // being an unmute form, no popup is shown
    await genericContactForm.openForm(unmutePerson.formId);
    await genericContactForm.submit();
    await expectForm(patient1, unmutePerson.formId);
  });
});
