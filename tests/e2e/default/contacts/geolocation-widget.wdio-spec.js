const fs = require('fs');
const path = require('path');
const utils = require('@utils');
const MS_PER_DAY = 86400000;
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const { CONTACT_TYPES } = require('@medic/constants');

const selectHomeContext = async () => {
  await $('.geolocation-context-options input[value="home"]').waitForExist();
  await $('.geolocation-context-options input[value="home"]').click();
};

const captureAndWait = async () => {
  await $('.geolocation-capture-btn').click();
  // GPS may succeed or fail depending on the environment. Wait for either outcome.
  await browser.waitUntil(
    async () => {
      const success = await $('.geolocation-success-msg').isExisting();
      const skip = await $('.geolocation-skip-btn').isExisting();
      return success || skip;
    },
    { timeout: 35000 }
  );
  if (await $('.geolocation-skip-btn').isExisting()) {
    await $('.geolocation-acknowledge-checkbox').waitForExist();
    await $('.geolocation-acknowledge-checkbox').click();
    await $('.geolocation-skip-btn').waitForEnabled();
    await $('.geolocation-skip-btn').click();
  }
};

describe('Geolocation widget - contact save pipeline', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

  const onlineUser = userFactory.build({
    place: healthCenter._id,
    roles: ['program_officer']
  });

  const personWithGeoType = {
    id: 'person_with_geo',
    name_key: 'contact.type.person_with_geo',
    group_key: 'contact.type.person_with_geo.plural',
    create_key: 'contact.type.person_with_geo.new',
    edit_key: 'contact.type.person_with_geo.edit',
    primary_contact_key: '',
    parents: [CONTACT_TYPES.HEALTH_CENTER, CONTACT_TYPES.CLINIC, 'district_hospital'],
    icon: 'medic-person',
    create_form: 'form:contact:person_with_geo:create',
    person: true
  };

  const translations = {
    'contact.type.person_with_geo': 'Person With Geo',
    'contact.type.person_with_geo.plural': 'People With Geo',
    'contact.type.person_with_geo.new': 'New Person With Geo',
    'contact.type.person_with_geo.edit': 'Edit Person With Geo'
  };

  const createFormXml = fs.readFileSync(
    path.join(__dirname, 'forms/geolocation-contact-create.xml'),
    'utf8'
  );

  const createFormDoc = {
    _id: 'form:contact:person_with_geo:create',
    internalId: 'contact:person_with_geo:create',
    title: 'New Person With Geo',
    type: 'form',
    _attachments: {
      xml: {
        content_type: 'application/octet-stream',
        data: Buffer.from(createFormXml).toString('base64'),
      }
    }
  };

  before(async () => {
    await utils.saveDocs([...places.values()]);
    await utils.createUsers([onlineUser]);
    await utils.addTranslations('en', translations);

    const settings = await utils.getSettings();
    settings.contact_types.push(personWithGeoType);
    await utils.updateSettings({ contact_types: settings.contact_types }, { ignoreReload: true });

    await utils.saveDocs([createFormDoc]);
    await loginPage.login(onlineUser);
  });

  after(async () => {
    await utils.deleteDocs([createFormDoc._id]);
    await utils.revertDb([/^form:/], true);
  });

  afterEach(async () => {
    await commonPage.goToPeople();
    await commonPage.waitForPageLoaded();
  });

  it('should store geolocation data on the contact doc when the form has a geolocation widget', async () => {
    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: personWithGeoType.id });

    await $('.or-appearance-geolocation-capture').waitForDisplayed();
    await selectHomeContext();
    await captureAndWait();
    await commonEnketoPage.setInputValue('Full name', 'Test Person With Geo');
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactId = await contactPage.getCurrentContactId();
    const savedDoc = await utils.getDoc(contactId);

    expect(savedDoc.geolocation_log).to.exist;
    expect(savedDoc.geolocation_log).to.have.lengthOf(1);
    expect(savedDoc.geolocation_log[0].timestamp).to.be.greaterThan(0);
    expect(savedDoc.geolocation_log[0].is_home).to.be.true;
    expect(savedDoc.geolocation_log[0].recording).to.exist;
  });

  describe('edit mode', () => {
    const seedGeoData = {
      latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 0, speed: 0
    };

    const contactWithGeo = {
      _id: 'person-with-geo-existing',
      type: 'contact',
      contact_type: 'person_with_geo',
      parent: { _id: healthCenter._id },
      name: 'Person With Existing Geo',
      reported_date: Date.now() - 10 * MS_PER_DAY,
      geolocation: seedGeoData,
      geolocation_log: [{
        timestamp: Date.now() - 3 * MS_PER_DAY,
        is_home: true,
        recording: seedGeoData,
      }],
    };

    before(async () => {
      await utils.saveDoc(contactWithGeo);
    });

    after(async () => {
      await utils.deleteDocs([contactWithGeo._id]);
    });

    const openEditForm = async () => {
      await browser.url(`/#/contacts/${contactWithGeo._id}/edit`);
      await commonPage.waitForPageLoaded();
      await $('.geolocation-edit-badge').waitForExist();
    };

    it('should show edit-mode badge and radios when editing a contact with existing geolocation', async () => {
      await openEditForm();

      expect(await $('.geolocation-edit-badge').isExisting()).to.be.true;
      expect(await $('.geolocation-edit-badge-context').isExisting()).to.be.true;
      expect(await $('.geolocation-edit-badge-meta').isExisting()).to.be.true;
      expect(await $('input[value="kept"]').isExisting()).to.be.true;
      expect(await $('input[value="capture-new"]').isExisting()).to.be.true;
      expect(await $('.geolocation-capture-btn').isExisting()).to.be.false;
      expect(await $('.geolocation-context-options').isExisting()).to.be.false;
    });

    it('should preserve geolocation data when keeping existing location and submitting', async () => {
      await openEditForm();

      await genericForm.submitForm();
      await commonPage.waitForPageLoaded();
      await contactPage.waitForContactLoaded();

      const savedDoc = await utils.getDoc(contactWithGeo._id);
      expect(savedDoc.geolocation_log).to.have.lengthOf(1);
      expect(savedDoc.geolocation_log[0].recording.latitude).to.equal(seedGeoData.latitude);
      expect(savedDoc.geolocation).to.exist;
      expect(savedDoc.geolocation.latitude).to.equal(seedGeoData.latitude);
    });

    it('should start GPS capture and handle the outcome when capture-new is acknowledged', async () => {
      await openEditForm();

      await $('input[value="capture-new"]').click();
      await $('.geolocation-edit-acknowledge-checkbox').waitForExist();
      await $('.geolocation-edit-acknowledge-checkbox').click();

      // GPS may succeed or fail depending on the environment. Wait for either outcome.
      await browser.waitUntil(
        async () => {
          const retry = await $('.geolocation-retry-btn').isExisting();
          const success = await $('.geolocation-success-msg').isExisting();
          return retry || success;
        },
        { timeout: 35000 }
      );

      if (await $('.geolocation-retry-btn').isExisting()) {
        // GPS failed — verify the revert path: continue without location returns to edit choice
        await $('.geolocation-acknowledge-checkbox').click();
        await $('.geolocation-skip-btn').click();

        await $('.geolocation-edit-options').waitForDisplayed();
        expect(await $('input[value="kept"]').isSelected()).to.be.true;
      } else {
        // GPS succeeded — verify the success message is shown
        expect(await $('.geolocation-success-msg').isExisting()).to.be.true;
      }
    });
  });
});
