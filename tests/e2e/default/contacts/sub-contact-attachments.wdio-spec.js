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
const { CONTACT_TYPES } = require('@medic/constants');

describe('Sub-contact attachment routing', () => {
  const familyPhotoPath = path.join(__dirname, '../enketo/images/photo-for-upload-form.png');
  const primaryContactPhotoPath = path.join(__dirname, '../../../../webapp/src/img/layers.png');
  const childPhotoPath = path.join(__dirname, '../../../../webapp/src/img/icon.png');

  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

  const onlineUser = userFactory.build({
    place: healthCenter._id,
    roles: ['program_officer']
  });

  const familyType = {
    id: 'family_with_attachments',
    name_key: 'contact.type.family_with_attachments',
    group_key: 'contact.type.family_with_attachments.plural',
    create_key: 'contact.type.family_with_attachments.new',
    edit_key: 'contact.type.family_with_attachments.edit',
    primary_contact_key: '',
    parents: [CONTACT_TYPES.HEALTH_CENTER, CONTACT_TYPES.CLINIC, 'district_hospital'],
    icon: 'medic-clinic',
    create_form: 'form:contact:family_with_attachments:create',
    edit_form: 'form:contact:family_with_attachments:edit',
    person: false
  };

  const translations = {
    'contact.type.family_with_attachments': 'Family With Attachments',
    'contact.type.family_with_attachments.plural': 'Families With Attachments',
    'contact.type.family_with_attachments.new': 'New Family With Attachments',
    'contact.type.family_with_attachments.edit': 'Edit Family With Attachments'
  };

  const createFormXml = fs.readFileSync(
    path.join(__dirname, 'forms/family-with-attachments-create.xml'),
    'utf8'
  );

  const editFormXml = fs.readFileSync(
    path.join(__dirname, 'forms/family-with-attachments-edit.xml'),
    'utf8'
  );

  const createFormDoc = {
    _id: 'form:contact:family_with_attachments:create',
    internalId: 'contact:family_with_attachments:create',
    title: 'New Family With Attachments',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(createFormXml).toString('base64'),
      }
    }
  };

  const editFormDoc = {
    _id: 'form:contact:family_with_attachments:edit',
    internalId: 'contact:family_with_attachments:edit',
    title: 'Edit Family With Attachments',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(editFormXml).toString('base64'),
      }
    }
  };

  const fetchFamilyAndChildren = async (familyId) => {
    const family = await utils.getDoc(familyId);
    const [familyDoc, primaryContact] = await utils.getDocs([familyId, family.contact._id]);
    const allRows = await utils.db.allDocs({ include_docs: true });
    const repeatChildren = allRows.rows
      .map(row => row.doc)
      .filter(doc => doc?.parent?._id === familyId && doc._id !== primaryContact._id);
    return { family: familyDoc, primaryContact, repeatChildren };
  };

  const submitFamilyForm = async ({ familyName, primaryContactName, repeatChildren }) => {
    await commonEnketoPage.setInputValue('Family Name', familyName);
    await commonEnketoPage.addFileInputValue('Family Photo', familyPhotoPath);

    await commonEnketoPage.setInputValue('Primary Contact Name', primaryContactName);
    await commonEnketoPage.addFileInputValue('Primary Contact Photo', primaryContactPhotoPath);

    for (let i = 0; i < repeatChildren.length; i++) {
      await commonEnketoPage.addRepeatSection();
      await commonEnketoPage.setInputValue('Child Name', repeatChildren[i].name);
      await commonEnketoPage.addFileInputValue('Child Photo', repeatChildren[i].photoPath, { repeatIndex: i });
    }

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();
  };

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([onlineUser]);
    await utils.addTranslations('en', translations);

    const settings = await utils.getSettings();
    settings.contact_types.push(familyType);
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
    await commonPage.waitForPageLoaded();
  });

  it('should route uploads to main, sibling, and repeat docs', async () => {
    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: familyType.id });

    await submitFamilyForm({
      familyName: 'Routing Family',
      primaryContactName: 'Amina',
      repeatChildren: [{ name: 'Kid Alpha', photoPath: childPhotoPath }],
    });

    const familyId = await contactPage.getCurrentContactId();
    expect(familyId).to.exist;

    const { family, primaryContact, repeatChildren } = await fetchFamilyAndChildren(familyId);

    expect(family.name).to.equal('Routing Family');
    expect(family._attachments).to.exist;
    const familyAttachmentNames = Object.keys(family._attachments);
    // Two attachments per owner doc: the file-widget upload and the inline-
    // binary `badge` from the form's instance default. The badge field value is
    // its attachment name minus the `user-file-` prefix.
    expect(familyAttachmentNames).to.have.lengthOf(2);
    const familyBadge = familyAttachmentNames.find(n => n.startsWith('user-file-') && n.endsWith('/badge'));
    expect(familyBadge, 'family badge attachment').to.exist;
    expect(familyAttachmentNames.find(n => /^user-file-photo-for-upload-form.*\.png$/.test(n))).to.exist;
    expect(family.badge).to.equal(familyBadge.replace('user-file-', ''));

    expect(primaryContact.name).to.equal('Amina');
    expect(primaryContact._attachments).to.exist;
    const primaryAttachmentNames = Object.keys(primaryContact._attachments);
    expect(primaryAttachmentNames).to.have.lengthOf(2);
    const primaryBadge = primaryAttachmentNames.find(n => n.startsWith('user-file-') && n.endsWith('/badge'));
    expect(primaryBadge, 'primary contact badge attachment').to.exist;
    expect(primaryAttachmentNames.find(n => /^user-file-layers.*\.png$/.test(n))).to.exist;
    expect(primaryContact.badge).to.equal(primaryBadge.replace('user-file-', ''));

    expect(repeatChildren).to.have.lengthOf(1);
    const [child] = repeatChildren;
    expect(child.name).to.equal('Kid Alpha');
    expect(child._attachments).to.exist;
    const childAttachmentNames = Object.keys(child._attachments);
    expect(childAttachmentNames).to.have.lengthOf(2);
    const childBadge = childAttachmentNames.find(n => n.startsWith('user-file-') && n.endsWith('/badge'));
    expect(childBadge, 'child badge attachment').to.exist;
    expect(childAttachmentNames.find(n => /^user-file-icon.*\.png$/.test(n))).to.exist;
    expect(child.badge).to.equal(childBadge.replace('user-file-', ''));

    const allAttachmentNames = [
      ...familyAttachmentNames,
      ...primaryAttachmentNames,
      ...childAttachmentNames,
    ];
    expect(new Set(allAttachmentNames).size).to.equal(6);
  });

  it('should keep saved attachments intact when adding a new repeat child on edit', async () => {
    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: familyType.id });

    await submitFamilyForm({
      familyName: 'Edit Family',
      primaryContactName: 'Bilal',
      repeatChildren: [{ name: 'Kid One', photoPath: childPhotoPath }],
    });

    const familyId = await contactPage.getCurrentContactId();
    const before = await fetchFamilyAndChildren(familyId);

    const snapshotAttachments = (doc) => Object.fromEntries(
      Object.entries(doc._attachments || {}).map(([key, value]) => [key, value.length])
    );
    const beforeFamily = snapshotAttachments(before.family);
    const beforePrimary = snapshotAttachments(before.primaryContact);
    expect(before.repeatChildren).to.have.lengthOf(1);
    const beforeKidOne = snapshotAttachments(before.repeatChildren[0]);

    await commonPage.accessEditOption();
    await commonPage.waitForPageLoaded();

    await commonEnketoPage.addRepeatSection();
    await commonEnketoPage.setInputValue('Child Name', 'Kid Two');
    await commonEnketoPage.addFileInputValue('Child Photo', familyPhotoPath, { repeatIndex: 0 });

    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const after = await fetchFamilyAndChildren(familyId);

    expect(snapshotAttachments(after.family)).to.deep.equal(beforeFamily);
    expect(snapshotAttachments(after.primaryContact)).to.deep.equal(beforePrimary);

    // The edit form has no <badge>, so no save-time attach happens for it and
    // the original badge attachment + field value survive the edit unchanged.
    expect(after.family.badge).to.equal(before.family.badge);
    expect(after.primaryContact.badge).to.equal(before.primaryContact.badge);

    const kidOneAfter = after.repeatChildren.find(c => c.name === 'Kid One');
    const kidTwoAfter = after.repeatChildren.find(c => c.name === 'Kid Two');
    expect(kidOneAfter, 'Kid One should still exist').to.exist;
    expect(kidTwoAfter, 'Kid Two should be created').to.exist;

    expect(snapshotAttachments(kidOneAfter)).to.deep.equal(beforeKidOne);
    const kidOneBefore = before.repeatChildren.find(c => c.name === 'Kid One');
    expect(kidOneAfter.badge).to.equal(kidOneBefore.badge);

    // Kid Two is created on edit — the edit form has no badge default for
    // children, so the new repeat child has no badge attachment.
    expect(kidTwoAfter._attachments).to.exist;
    const kidTwoAttachmentNames = Object.keys(kidTwoAfter._attachments);
    expect(kidTwoAttachmentNames).to.have.lengthOf(1);
    expect(kidTwoAttachmentNames[0]).to.match(/^user-file-photo-for-upload-form.*\.png$/);
  });
});
