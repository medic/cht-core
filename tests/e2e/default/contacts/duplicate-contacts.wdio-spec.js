const { cookieLogin } = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const utils = require('@utils');
const personFactory = require('@factories/cht/contacts/person');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const moment = require('moment');
const contactsPage = require('@page-objects/default/contacts/contacts.wdio.page');
const { getTelemetryDbName, destroyDbInBrowser, getTelemetryFromBrowser } = require('@utils/telemetry');
const { USERNAME } = require('@constants');

// skipped due to https://github.com/medic/cht-core/issues/10382
describe.skip('Duplicate contact detection', () => {
  const CREATED_ON = '4 Apr, 2025';
  const TELEMETRY_DB_NAME= getTelemetryDbName(USERNAME, new Date());
  const CREATE_PERSON_FORM_ID = 'form:contact:person:create';
  const getTelemetry = key => getTelemetryFromBrowser(TELEMETRY_DB_NAME, key);

  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  districtHospital.reported_date = moment(CREATED_ON);
  districtHospital.external_id = '1234567890';
  const household = places.get('clinic');
  const patients = Array
    .from({ length: 4 })
    .map((_, i) => personFactory.build({
      parent: { _id: household._id, parent: household.parent },
      reported_date: moment(CREATED_ON),
      patient_id: `patient-${i}`,
    }));
  // Last patient has different birthdate
  patients[3].date_of_birth = '2021-02-01';

  let originalCreatePersonFormDoc;
  const updateCreatePersonFormDoc = async (updateData) => {
    const { _rev } = await utils.getDoc(CREATE_PERSON_FORM_ID);
    await utils.saveDocs([{
      ...originalCreatePersonFormDoc,
      _rev,
      ...updateData,
    }]);
  };

  before(async () => {
    await cookieLogin();
    originalCreatePersonFormDoc = await utils.getDoc(CREATE_PERSON_FORM_ID);
  });

  beforeEach(async () => {
    await utils.saveDocs([ ...places.values(), ...patients ]);
  });

  afterEach(async () => {
    await destroyDbInBrowser(TELEMETRY_DB_NAME);
    await utils.revertDb([/^form:/], true);
    await updateCreatePersonFormDoc({});
  });

  it('detects duplicates when creating top-level place - allows acknowledging', async () => {
    await commonPage.goToPeople();
    await contactsPage.addPlace(
      { placeName: districtHospital.name },
      { rightSideAction: false, waitForComplete: false }
    );

    const duplicates = await genericForm.getDuplicateContactHeadings();
    expect(duplicates).to.deep.equal([{ name: districtHospital.name, createdOn: CREATED_ON }]);
    const dupExternalId = await genericForm.getDuplicateContactSummaryField(0, 'external.id');
    expect(dupExternalId).to.equal(districtHospital.external_id);

    // Try to submit again
    await genericForm.submitForm({ waitForPageLoaded: false });

    // Duplicates still shown
    expect(await genericForm.getDuplicateContactHeadings()).to.deep.equal(duplicates);

    await genericForm.checkAcknowledgeDuplicatesBox();

    // Form should submit successfully
    await genericForm.submitForm();

    expect(await contactsPage.getContactInfoName()).to.equal(districtHospital.name);
    expect(await contactsPage.getCurrentContactId()).to.not.equal(districtHospital._id);

    const dupeFoundTelemetries = await getTelemetry(`enketo:contacts:${districtHospital.type}:duplicates_found`);
    expect(dupeFoundTelemetries).to.have.lengthOf(2);
    dupeFoundTelemetries.forEach(telemetry => expect(telemetry).to.deep.include({ value: 1 }));

    const dupeCheckTelemetries = await getTelemetry(`enketo:contacts:${districtHospital.type}:duplicate_check`);
    expect(dupeCheckTelemetries).to.have.lengthOf(2);

    const dupeAckTelemetries = await getTelemetry(`enketo:contacts:${districtHospital.type}:duplicates_acknowledged`);
    expect(dupeAckTelemetries).to.have.lengthOf(1);
  });

  it('detects duplicates when creating person - clears dupes when form updated', async () => {
    await commonPage.goToPeople(household._id);
    await contactsPage.addPerson(
      {
        name: patients[0].name,
        dob: patients[0].date_of_birth,
      },
      { waitForComplete: false }
    );

    const expectedDuplicates = patients.slice(0, 3);
    const duplicates = await genericForm.getDuplicateContactHeadings();
    expect(duplicates).to.deep.equal(expectedDuplicates.map(({ name }) => ({ name, createdOn: CREATED_ON })));

    // Update patient's DOB to be different
    await commonEnketoPage.setDateValue('Age', '1991-01-01');

    // Form should submit successfully
    await genericForm.submitForm();

    expect(await contactsPage.getContactInfoName()).to.equal(patients[0].name);
    const currentContactId = await contactsPage.getCurrentContactId();
    patients.forEach(({ _id }) => expect(currentContactId).to.not.equal(_id));

    const dupeFoundTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_found`);
    expect(dupeFoundTelemetries).to.have.lengthOf(2);
    expect(dupeFoundTelemetries[0]).to.deep.include({ value: 3 });
    expect(dupeFoundTelemetries[1]).to.deep.include({ value: 0 });

    const dupeCheckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicate_check`);
    expect(dupeCheckTelemetries).to.have.lengthOf(2);

    const dupeAckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_acknowledged`);
    expect(dupeAckTelemetries).to.be.empty;
  });

  it('detects duplicates when editing a contact - navigates to duplicate contact', async () => {
    await commonPage.goToPeople(patients[0]._id);
    await commonPage.accessEditOption();
    await genericForm.nextPage();
    await commonEnketoPage.setDateValue('Age', patients[3].date_of_birth);
    await genericForm.submitForm({ waitForPageLoaded: false });

    const duplicates = await genericForm.getDuplicateContactHeadings();
    expect(duplicates).to.deep.equal([{ name: patients[3].name, createdOn: CREATED_ON }]);
    const dupPatientId = await genericForm.getDuplicateContactSummaryField(0, 'patient_id');
    expect(dupPatientId).to.equal(patients[3].patient_id);

    await genericForm.openDuplicateContact();
    await modalPage.submit();

    expect(await contactsPage.getContactInfoName()).to.equal(patients[3].name);
    expect(await contactsPage.getCurrentContactId()).to.equal(patients[3]._id);

    const dupeFoundTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_found`);
    expect(dupeFoundTelemetries).to.have.lengthOf(1);
    expect(dupeFoundTelemetries[0]).to.deep.include({ value: 1 });

    const dupeCheckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicate_check`);
    expect(dupeCheckTelemetries).to.have.lengthOf(1);

    const dupeAckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_acknowledged`);
    expect(dupeAckTelemetries).to.be.empty;
  });

  it('detects duplicates from a custom duplicate expression', async () => {
    await updateCreatePersonFormDoc({
      duplicate_check: {
        expression: 'current.external_id === existing.patient_id',
      }
    });

    await commonPage.goToPeople(household._id);
    await contactsPage.addPerson(
      {
        name: 'Totally different name',
        dob: '1984-01-01',
        externalID: patients[3].patient_id,
      },
      { waitForComplete: false }
    );

    const duplicates = await genericForm.getDuplicateContactHeadings();
    expect(duplicates).to.deep.equal([{ name: patients[3].name, createdOn: CREATED_ON }]);
    const dupPatientId = await genericForm.getDuplicateContactSummaryField(0, 'patient_id');
    expect(dupPatientId).to.equal(patients[3].patient_id);

    await genericForm.cancelForm();
    await modalPage.submit();

    const dupeFoundTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_found`);
    expect(dupeFoundTelemetries).to.have.lengthOf(1);
    expect(dupeFoundTelemetries[0]).to.deep.include({ value: 1 });

    const dupeCheckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicate_check`);
    expect(dupeCheckTelemetries).to.have.lengthOf(1);

    const dupeAckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_acknowledged`);
    expect(dupeAckTelemetries).to.be.empty;
  });

  it('does not detect duplicates when expression is disabled', async () => {
    await updateCreatePersonFormDoc({
      duplicate_check: {
        disabled: true,
      }
    });

    await commonPage.goToPeople(household._id);
    await contactsPage.addPerson({
      name: patients[0].name,
      dob: patients[0].date_of_birth,
    });

    expect(await contactsPage.getContactInfoName()).to.equal(patients[0].name);
    const currentContactId = await contactsPage.getCurrentContactId();
    patients.forEach(({ _id }) => expect(currentContactId).to.not.equal(_id));

    const dupeFoundTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_found`);
    expect(dupeFoundTelemetries).to.have.lengthOf(1);
    expect(dupeFoundTelemetries[0]).to.deep.include({ value: 0 });

    const dupeCheckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicate_check`);
    expect(dupeCheckTelemetries).to.have.lengthOf(1);

    const dupeAckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_acknowledged`);
    expect(dupeAckTelemetries).to.be.empty;
  });

  it('can add duplicate contact that is not a sibling', async () => {
    await commonPage.goToPeople(districtHospital._id);
    await contactsPage.addPerson({
      name: patients[0].name,
      dob: patients[0].date_of_birth,
    });

    expect(await contactsPage.getContactInfoName()).to.equal(patients[0].name);
    const currentContactId = await contactsPage.getCurrentContactId();
    patients.forEach(({ _id }) => expect(currentContactId).to.not.equal(_id));

    const dupeFoundTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_found`);
    expect(dupeFoundTelemetries).to.have.lengthOf(1);
    expect(dupeFoundTelemetries[0]).to.deep.include({ value: 0 });

    const dupeCheckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicate_check`);
    expect(dupeCheckTelemetries).to.have.lengthOf(1);

    const dupeAckTelemetries = await getTelemetry(`enketo:contacts:${patients[0].type}:duplicates_acknowledged`);
    expect(dupeAckTelemetries).to.be.empty;
  });
});
