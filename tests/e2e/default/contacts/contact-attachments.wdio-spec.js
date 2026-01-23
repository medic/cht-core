const path = require('path');
const fs = require('fs');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');

/**
 * E2E tests for contact forms with file attachments.
 *
 * These tests verify the full workflow:
 * 1. Contact form with upload fields renders correctly
 * 2. Files can be uploaded via the form
 * 3. Contact is created with attachments saved to the database
 * 4. Attachments are preserved when editing contacts
 */
describe('Contact form attachments', () => {
  const imagePath = path.join(__dirname, '../enketo/images/photo-for-upload-form.png');
  const documentPath = path.join(__dirname, '../../../../webapp/src/img/layers.png');

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');

  const onlineUser = userFactory.build({
    place: healthCenter._id,
    roles: ['program_officer']
  });

  const personWithAttachmentsType = {
    id: 'person_with_attachments',
    name_key: 'contact.type.person_with_attachments',
    group_key: 'contact.type.person_with_attachments.plural',
    create_key: 'contact.type.person_with_attachments.new',
    edit_key: 'contact.type.person_with_attachments.edit',
    primary_contact_key: '',
    parents: ['health_center', 'clinic', 'district_hospital'],
    icon: 'medic-person',
    create_form: 'form:contact:person_with_attachments:create',
    edit_form: 'form:contact:person_with_attachments:edit',
    person: true
  };

  const translations = {
    'contact.type.person_with_attachments': 'Person With Attachments',
    'contact.type.person_with_attachments.plural': 'People With Attachments',
    'contact.type.person_with_attachments.new': 'New Person With Attachments',
    'contact.type.person_with_attachments.edit': 'Edit Person With Attachments'
  };

  const createFormXml = fs.readFileSync(
    path.join(__dirname, 'forms/person-with-attachments-create.xml'),
    'utf8'
  );

  const editFormXml = fs.readFileSync(
    path.join(__dirname, 'forms/person-with-attachments-edit.xml'),
    'utf8'
  );

  const createFormDoc = {
    _id: 'form:contact:person_with_attachments:create',
    internalId: 'contact:person_with_attachments:create',
    title: 'New Person With Attachments',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(createFormXml).toString('base64'),
      }
    }
  };

  const editFormDoc = {
    _id: 'form:contact:person_with_attachments:edit',
    internalId: 'contact:person_with_attachments:edit',
    title: 'Edit Person With Attachments',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(editFormXml).toString('base64'),
      }
    }
  };

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([onlineUser]);
    await utils.addTranslations('en', translations);

    const settings = await utils.getSettings();
    settings.contact_types.push(personWithAttachmentsType);
    await utils.updateSettings({ contact_types: settings.contact_types }, { ignoreReload: true });

    await utils.saveDocs([createFormDoc, editFormDoc]);

    await loginPage.login(onlineUser);
  });

  after(async () => {
    await utils.deleteDocs([createFormDoc._id, editFormDoc._id]);
    await utils.revertDb([/^form:/], true);
  });

  afterEach(async () => {
    await commonPage.goToPeople();
  });

  it('should create contact with image attachment', async () => {
    const contactName = 'Test Person With Photo';

    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: personWithAttachmentsType.id });

    await commonEnketoPage.setInputValue('Full name', contactName);
    await commonEnketoPage.addFileInputValue('Photo', imagePath);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactId = await contactPage.getCurrentContactId();
    expect(contactId).to.exist;

    const createdContact = await utils.getDoc(contactId);

    expect(createdContact).to.exist;
    expect(createdContact.name).to.equal(contactName);
    expect(createdContact._attachments).to.exist;

    const attachmentNames = Object.keys(createdContact._attachments);
    expect(attachmentNames).to.have.lengthOf(1);
    expect(attachmentNames[0]).to.match(/^user-file-photo-for-upload-form.*\.png$/);
    expect(createdContact._attachments[attachmentNames[0]].content_type).to.equal('image/png');
  });

  it('should create contact with multiple attachments (image + document)', async () => {
    const contactName = 'Test Person With Multiple Files';

    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: personWithAttachmentsType.id });

    await commonEnketoPage.setInputValue('Full name', contactName);
    await commonEnketoPage.addFileInputValue('Photo', imagePath);
    await commonEnketoPage.addFileInputValue('Document', documentPath);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactId = await contactPage.getCurrentContactId();
    expect(contactId).to.exist;

    const createdContact = await utils.getDoc(contactId);

    expect(createdContact).to.exist;
    expect(createdContact.name).to.equal(contactName);
    expect(createdContact._attachments).to.exist;

    const attachmentNames = Object.keys(createdContact._attachments);
    expect(attachmentNames).to.have.lengthOf(2);
  });

  it('should preserve attachments when editing contact', async () => {
    const originalName = 'Person To Edit';
    const updatedName = 'Person Edited';

    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: personWithAttachmentsType.id });

    await commonEnketoPage.setInputValue('Full name', originalName);
    await commonEnketoPage.addFileInputValue('Photo', imagePath);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactId = await contactPage.getCurrentContactId();
    expect(contactId).to.exist;

    const contactBefore = await utils.getDoc(contactId);
    expect(contactBefore._attachments).to.exist;
    const originalAttachments = Object.keys(contactBefore._attachments);
    expect(originalAttachments).to.have.lengthOf(1);

    await commonPage.accessEditOption();

    await commonEnketoPage.setInputValue('Full name', updatedName);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactAfter = await utils.getDoc(contactId);

    expect(contactAfter.name).to.equal(updatedName);
    expect(contactAfter._attachments).to.exist;

    const attachmentsAfter = Object.keys(contactAfter._attachments);
    expect(attachmentsAfter).to.have.lengthOf(1);
    expect(attachmentsAfter[0]).to.equal(originalAttachments[0]);
  });
});
