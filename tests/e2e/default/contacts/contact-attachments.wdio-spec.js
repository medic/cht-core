const path = require('path');
const fs = require('fs');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Contact form attachments', () => {
  const photoPngPath = path.join(__dirname, '../enketo/images/photo-for-upload-form.png');
  const layersPngPath = path.join(__dirname, '../../../../webapp/src/img/layers.png');
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

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
    parents: [CONTACT_TYPES.HEALTH_CENTER, CONTACT_TYPES.CLINIC, 'district_hospital'],
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

  const createFormDoc = commonPage.createFormDoc(
    path.join(__dirname, 'forms/person-with-attachments-create'),
    'contact:person_with_attachments:create'
  );
  const editFormDoc = commonPage.createFormDoc(
    path.join(__dirname, 'forms/person-with-attachments-edit'),
    'contact:person_with_attachments:edit'
  );

  const createContactWithAttachment = (contactName, imagePath = photoPngPath) => {
    const imageBuffer = fs.readFileSync(imagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const timestamp = new Date().toTimeString().split(' ')[0].replace(/:/g, '_');
    const filename = path.basename(imagePath, path.extname(imagePath));
    const extension = path.extname(imagePath);
    const attachmentKey = `user-file-${filename}-${timestamp}${extension}`;
    const profileImageValue = attachmentKey.replace('user-file-', '');

    return personFactory.build({
      name: contactName,
      parent: { _id: healthCenter._id, parent: healthCenter.parent },
      type: 'contact',
      contact_type: 'person_with_attachments',
      profile_image: profileImageValue,
      _attachments: {
        [attachmentKey]: {
          content_type: `image/${extension.slice(1)}`,
          data: imageBase64
        }
      }
    });
  };

  let originalContactTypes;

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([onlineUser]);
    await utils.addTranslations('en', translations);

    originalContactTypes = (await utils.getSettings()).contact_types;
    const contactTypes = [...originalContactTypes, personWithAttachmentsType];
    await utils.updateSettings({ contact_types: contactTypes }, { ignoreReload: true });

    await utils.saveDocs([createFormDoc, editFormDoc]);

    await loginPage.login(onlineUser);
  });

  after(async () => {
    await utils.deleteDocs([createFormDoc._id, editFormDoc._id]);
    await utils.revertDb([/^form:/], true);
  });

  afterEach(async () => {
    await commonPage.goToPeople();
    await commonPage.waitForPageLoaded();
  });

  it('should create contact with multiple attachments (image + document)', async () => {
    const contactName = 'Test Person With Multiple Files';

    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: personWithAttachmentsType.id });

    await commonEnketoPage.setInputValue('Full name', contactName);
    await commonEnketoPage.addFileInputValue('Profile Image', photoPngPath);
    await commonEnketoPage.addFileInputValue('Document', layersPngPath);

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
    expect(attachmentNames).to.have.lengthOf(3);

    const photoAttachment = attachmentNames.find(name => name.match(/^user-file-photo-for-upload-form.*\.png$/));
    const documentAttachment = attachmentNames.find(name => name.match(/^user-file-layers.*\.png$/));

    expect(photoAttachment, 'Photo attachment should exist').to.exist;
    expect(documentAttachment, 'Document attachment should exist').to.exist;
    expect(photoAttachment, 'Photo and document should be different attachments').to.not.equal(documentAttachment);

    expect(createdContact._attachments[photoAttachment].content_type).to.equal('image/png');
    expect(createdContact._attachments[photoAttachment].length, 'Photo should have a valid size').to.be.greaterThan(0);

    expect(createdContact._attachments[documentAttachment].content_type).to.equal('image/png');
    expect(createdContact._attachments[documentAttachment].length, 'Document should have a valid size')
      .to.be.greaterThan(0);

    expect(createdContact._attachments['user-file/badge'].content_type).to.equal('image/png');
    expect(createdContact._attachments['user-file/badge'].length).to.be.greaterThan(0);

    // Photo is displayed as contact's profile image
    const profileImage = await contactPage.getContactCardProfileImage();
    await profileImage.waitForDisplayed();
    const src = await profileImage.getAttribute('src');
    expect(src).to.match(/^blob:/);
  });

  it('should preserve attachments when editing contact', async () => {
    const originalName = 'Person To Edit';
    const updatedName = 'Person Edited';

    await commonPage.goToPeople(healthCenter._id);

    await commonPage.clickFastActionFAB({ actionId: personWithAttachmentsType.id });

    await commonEnketoPage.setInputValue('Full name', originalName);
    await commonEnketoPage.addFileInputValue('Profile Image', photoPngPath);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactId = await contactPage.getCurrentContactId();
    expect(contactId).to.exist;

    const contactBefore = await utils.getDoc(contactId);
    expect(contactBefore._attachments).to.exist;
    const originalAttachments = Object.keys(contactBefore._attachments);
    expect(originalAttachments).to.have.lengthOf(2);
    expect(originalAttachments[0]).to.match(/^user-file-photo-for-upload-form.*\.png$/);
    expect(originalAttachments[1]).to.equal('user-file/badge');

    await commonPage.accessEditOption();

    await commonEnketoPage.setInputValue('Full name', updatedName);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactAfter = await utils.getDoc(contactId);

    expect(contactAfter.name).to.equal(updatedName);
    expect(contactAfter._attachments).to.exist;

    const attachmentsAfter = Object.keys(contactAfter._attachments);
    expect(attachmentsAfter).to.deep.equal(originalAttachments);
    expect(contactAfter._attachments[attachmentsAfter[0]].length, 'Preserved attachment should have a valid size')
      .to.be.greaterThan(0);
    expect(contactAfter._attachments[attachmentsAfter[1]].length, 'Preserved attachment should have a valid size')
      .to.be.greaterThan(0);
  });

  it('should remove attachment when editing contact', async () => {
    const contact = createContactWithAttachment('Person With Photo To Remove');
    await utils.saveDocs([contact]);

    const contactBefore = await utils.getDoc(contact._id);
    expect(contactBefore._attachments).to.exist;
    expect(Object.keys(contactBefore._attachments)).to.have.lengthOf(1);

    await browser.url(`#/contacts/${contact._id}/edit`);
    await commonPage.waitForPageLoaded();

    const profileImageLabel = await $('label[data-contains-ref-target="/data/person_with_attachments/profile_image"]');
    const filePicker = await profileImageLabel.$('.file-picker');
    const resetButton = await filePicker.$('button.btn-reset');

    const dialog = await new Promise((resolve) => {
      browser.on('dialog', resolve);
      resetButton.click();
    });
    await dialog.accept();

    const filePreview = await filePicker.$('.file-preview img');
    await filePreview.waitForExist({ reverse: true, timeout: 5000 });

    const fakeInput = await filePicker.$('.fake-file-input');
    expect(await fakeInput.getValue()).to.equal('');

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactAfter = await utils.getDoc(contact._id);
    expect(contactAfter.profile_image).to.equal('');
    expect(contactAfter._attachments).to.be.undefined;

    // No photo, so default icon displayed instead of profile image
    const profileImage = await contactPage.getContactCardProfileImage();
    expect(await profileImage.isExisting()).to.be.false;
    const fallback = await $('.card .heading mm-contact-profile-image span .resource-icon');
    await fallback.waitForDisplayed();
  });

  it('should replace attachment when editing contact', async () => {
    const contact = createContactWithAttachment('Person With Photo To Replace');
    await utils.saveDocs([contact]);

    const contactBefore = await utils.getDoc(contact._id);
    expect(contactBefore._attachments).to.exist;
    const originalAttachmentNames = Object.keys(contactBefore._attachments);
    expect(originalAttachmentNames).to.have.lengthOf(1);
    const originalAttachmentName = originalAttachmentNames[0];

    await browser.url(`#/contacts/${contact._id}/edit`);
    await commonPage.waitForPageLoaded();

    const profileImageLabel = await $('label[data-contains-ref-target="/data/person_with_attachments/profile_image"]');
    const filePicker = await profileImageLabel.$('.file-picker');
    const resetButton = await filePicker.$('button.btn-reset');

    const dialog = await new Promise((resolve) => {
      browser.on('dialog', resolve);
      resetButton.click();
    });
    await dialog.accept();

    const filePreview = await filePicker.$('.file-preview img');
    await filePreview.waitForExist({ reverse: true, timeout: 5000 });

    await commonEnketoPage.addFileInputValue('Profile Image', layersPngPath);

    await genericForm.submitForm();

    const contactAfter = await utils.getDoc(contact._id);
    expect(contactAfter._attachments).to.exist;

    const newAttachmentNames = Object.keys(contactAfter._attachments);
    expect(newAttachmentNames).to.have.lengthOf(1);
    const newAttachmentName = newAttachmentNames[0];

    expect(newAttachmentName).to.not.equal(originalAttachmentName);
    expect(contactAfter.profile_image).to.not.equal('');
    expect(contactAfter.profile_image).to.not.equal(contactBefore.profile_image);

    expect(newAttachmentName).to.match(/^user-file-layers.*\.png$/);
    expect(contactAfter.profile_image).to.equal(newAttachmentName.replace('user-file-', ''));
    expect(contactAfter._attachments[newAttachmentName].content_type).to.equal('image/png');
    expect(contactAfter._attachments[newAttachmentName].length, 'Replaced attachment should have a valid size')
      .to.be.greaterThan(0);
  });

  it('should render the profile photo for a binary attachment and custom profile_image_field', async () => {
    // Update settings to use custom profile image field
    const contactTypes = [...originalContactTypes, {
      ...personWithAttachmentsType,
      profile_image_field: 'badge'
    }];
    await utils.updateSettings({ contact_types: contactTypes }, { ignoreReload: true });

    const contactName = 'Test Person With Binary profile image';
    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: personWithAttachmentsType.id });

    await commonEnketoPage.setInputValue('Full name', contactName);

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactId = await contactPage.getCurrentContactId();
    const createdContact = await utils.getDoc(contactId);
    expect(createdContact.name).to.equal(contactName);
    const attachmentNames = Object.keys(createdContact._attachments);
    expect(attachmentNames).to.have.lengthOf(1);
    expect(createdContact._attachments['user-file/badge'].content_type).to.equal('image/png');
    expect(createdContact._attachments['user-file/badge'].length).to.be.greaterThan(0);

    // Binary Photo is displayed as contact's profile image
    const profileImage = await contactPage.getContactCardProfileImage();
    await profileImage.waitForDisplayed();
    const src = await profileImage.getAttribute('src');
    expect(src).to.match(/^blob:/);
  });
});
