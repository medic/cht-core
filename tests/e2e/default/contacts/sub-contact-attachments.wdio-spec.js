const path = require('path');
const fs = require('fs');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Sub-contact attachment routing', () => {
  const BINARY_IMAGE_DATA = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADve' +
    'WkH6oAAAAAElFTkSuQmCC';
  const familyPhotoPath = path.join(__dirname, '../enketo/images/photo-for-upload-form.png');

  const healthCenterType = {
    id: 'health_center_with_attachments',
    parents: [CONTACT_TYPES.HEALTH_CENTER, CONTACT_TYPES.CLINIC, 'district_hospital'],
    create_form: 'form:contact:health_center_with_attachments:create',
    edit_form: 'form:contact:health_center_with_attachments:edit',
    person: false
  };
  const createFormDoc = {
    _id: 'form:contact:health_center_with_attachments:create',
    internalId: 'contact:health_center_with_attachments:create',
    title: 'New Family With Attachments',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(fs.readFileSync(
          path.join(__dirname, 'forms/health_center-with-attachments-create.xml'),
          'utf8'
        )).toString('base64'),
      }
    }
  };
  const editFormDoc = {
    _id: 'form:contact:health_center_with_attachments:edit',
    internalId: 'contact:health_center_with_attachments:edit',
    title: 'Edit Family With Attachments',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(fs.readFileSync(
          path.join(__dirname, 'forms/health_center-with-attachments-edit.xml'),
          'utf8'
        )).toString('base64'),
      }
    }
  };

  const districtHospital = placeFactory.place().build({
    name: 'District Hospital',
    type: CONTACT_TYPES.DISTRICT_HOSPITAL
  });

  before(async () => {
    const settings = await utils.getSettings();
    settings.contact_types.push(healthCenterType);
    await utils.updateSettings({ contact_types: settings.contact_types }, { ignoreReload: true });
    await utils.saveDocs([districtHospital, createFormDoc, editFormDoc]);
    await loginPage.cookieLogin();
  });

  after(async () => {
    await utils.deleteDocs([createFormDoc._id, editFormDoc._id]);
    await utils.revertDb([/^form:/], true);
  });

  it('creates place with parent, contact, and children all having attachments', async () => {
    await commonPage.goToPeople(districtHospital._id);
    await commonPage.clickFastActionFAB({ actionId: healthCenterType.id });

    await commonEnketoPage.setInputValue('Parent Name', 'parent');
    await commonEnketoPage.setInputValue('Parent Badge', BINARY_IMAGE_DATA);
    await commonEnketoPage.addFileInputValue('Parent Photo', familyPhotoPath);

    await commonEnketoPage.setInputValue('Contact Name', 'contact');
    await commonEnketoPage.setInputValue('Contact Badge', BINARY_IMAGE_DATA);
    await commonEnketoPage.addFileInputValue('Contact Photo', familyPhotoPath);

    await commonEnketoPage.setInputValue('Health Center Name', 'contact');
    await commonEnketoPage.setInputValue('Health Center Badge', BINARY_IMAGE_DATA);
    await commonEnketoPage.addFileInputValue('Health Center Photo', familyPhotoPath);

    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.setInputValue('Child Name', 'child0');
    await commonEnketoPage.setInputValue('Child Badge', BINARY_IMAGE_DATA);
    await commonEnketoPage.addFileInputValue('Child Photo', familyPhotoPath);

    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.setInputValue('Child Name', 'child1', { repeatIndex: 1 });
    await commonEnketoPage.setInputValue('Child Badge', BINARY_IMAGE_DATA, { repeatIndex: 1 });
    await commonEnketoPage.addFileInputValue('Child Photo', familyPhotoPath, { repeatIndex: 1 });

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const childIds = await contactPage.getAllRHSPlaceIds();
    expect(childIds).to.have.lengthOf(2);
    const healthCenter = await utils.getDoc(await contactPage.getCurrentContactId());
    const [primaryContact, parent, child0, child1] = await utils.getDocs([
      healthCenter.contact._id,
      healthCenter.parent._id,
      ...childIds
    ]);

    expect(healthCenter).to.deep.include({
      name: 'contact',
      badge: '',
      parent: { _id: parent._id },
      contact: { _id: primaryContact._id, parent: { _id: healthCenter._id, parent: { _id: parent._id } } }
    });
    expect(healthCenter.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(healthCenter._attachments)).to.deep.equal([
      `user-file-${healthCenter.photo}`,
      'user-file/badge'
    ]);
    expect(primaryContact).to.deep.include({
      _id: healthCenter.contact._id,
      parent: { _id: healthCenter._id, parent: { _id: parent._id } },
      name: 'contact',
      badge: '',
    });
    expect(primaryContact.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(primaryContact._attachments)).to.deep.equal([
      `user-file-${primaryContact.photo}`,
      'user-file/badge'
    ]);
    expect(parent).to.deep.include({
      _id: healthCenter.parent._id,
      name: 'parent',
      badge: '',
    });
    expect(parent.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(parent._attachments)).to.deep.equal([
      `user-file-${parent.photo}`,
      'user-file/badge'
    ]);
    expect(child0).to.deep.include({
      name: 'child0',
      badge: '',
      parent: { _id: healthCenter._id, parent: { _id: parent._id } },
    });
    expect(child0.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(child0._attachments)).to.deep.equal([
      `user-file-${child0.photo}`,
      'user-file/badge'
    ]);
    expect(child1).to.deep.include({
      name: 'child1',
      badge: '',
      parent: { _id: healthCenter._id, parent: { _id: parent._id } },
    });
    expect(child1.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(child1._attachments)).to.deep.equal([
      `user-file-${child1.photo}`,
      'user-file/badge'
    ]);
  });

  it('maintains attachments as expected when editing a contact to add children', async () => {
    await commonPage.accessEditOption();
    await commonPage.waitForPageLoaded();

    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.setInputValue('Child Name', 'child2');
    await commonEnketoPage.setInputValue('Child Badge', BINARY_IMAGE_DATA);
    await commonEnketoPage.addFileInputValue('Child Photo', familyPhotoPath);

    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.setInputValue('Child Name', 'child3', { repeatIndex: 1 });
    await commonEnketoPage.setInputValue('Child Badge', BINARY_IMAGE_DATA, { repeatIndex: 1 });
    await commonEnketoPage.addFileInputValue('Child Photo', familyPhotoPath, { repeatIndex: 1 });

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const childIds = await contactPage.getAllRHSPlaceIds();
    expect(childIds).to.have.lengthOf(4);
    const [healthCenter, child2, child3] = await utils.getDocs([
      await contactPage.getCurrentContactId(),
      childIds[2],
      childIds[3]
    ]);

    expect(healthCenter.badge).to.equal('');
    expect(healthCenter.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(healthCenter._attachments)).to.deep.equal([
      `user-file-${healthCenter.photo}`,
      'user-file/badge'
    ]);
    expect(child2).to.deep.include({
      name: 'child2',
      badge: '',
      parent: { _id: healthCenter._id, parent: healthCenter.parent },
    });
    expect(child2.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(child2._attachments)).to.deep.equal([
      `user-file-${child2.photo}`,
      'user-file/badge'
    ]);
    expect(child3).to.deep.include({
      name: 'child3',
      badge: '',
      parent: { _id: healthCenter._id, parent: healthCenter.parent },
    });
    expect(child3.photo).to.match(/^photo-for-upload-form-/);
    expect(Object.keys(child3._attachments)).to.deep.equal([
      `user-file-${child3.photo}`,
      'user-file/badge'
    ]);
  });
});
