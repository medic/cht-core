/* global window */
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
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const { CONTACT_TYPES } = require('@medic/constants');

const GEO_SUCCESS = {
  latitude: 1, longitude: 2, altitude: 3, accuracy: 4, altitudeAccuracy: 5, heading: 0, speed: 0
};
const GEO_FAILURE = { code: -2, message: 'Geolocation timeout exceeded' };

const SELECTORS = {
  ACKNOWLEDGE_CHECKBOX: '.geolocation-acknowledge-checkbox',
  CAPTURE_NEW_RADIO: 'input[value="capture-new"]',
  CONTEXT_OPTIONS: '.geolocation-context-options',
  EDIT_ACKNOWLEDGE_CHECKBOX: '.geolocation-edit-acknowledge-checkbox',
  EDIT_BADGE: '.geolocation-edit-badge',
  EDIT_BADGE_CONTEXT: '.geolocation-edit-badge-context',
  EDIT_OPTIONS: '.geolocation-edit-options',
  GEO_CAPTURE_CONTAINER: '.or-appearance-geolocation-capture',
  HOME_RADIO: '.geolocation-context-options input[value="home"]',
  KEPT_RADIO: 'input[value="kept"]',
  OTHER_RADIO: '.geolocation-context-options input[value="other"]',
  RETRY_BTN: '.geolocation-retry-btn',
  SKIP_BTN: '.geolocation-skip-btn',
  SUCCESS_MSG: '.geolocation-success-msg',
};

const selectHomeContext = async () => {
  await $(SELECTORS.HOME_RADIO).waitForExist();
  await $(SELECTORS.HOME_RADIO).click();
};

const selectOtherContext = async () => {
  await $(SELECTORS.OTHER_RADIO).waitForExist();
  await $(SELECTORS.OTHER_RADIO).click();
};

const mockGeoResolved = async (result) => {
  await browser.execute((r) => {
    window.CHTCore.Geolocation.currentPromise = Promise.resolve(r);
  }, result);
};

describe('HouseholdGeolocation widget - contact save pipeline', () => {
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

  it('should store geolocation data on the contact doc when home context is captured', async () => {
    await commonPage.goToPeople(healthCenter._id);
    await commonPage.clickFastActionFAB({ actionId: personWithGeoType.id });

    await $(SELECTORS.GEO_CAPTURE_CONTAINER).waitForDisplayed();
    await mockGeoResolved(GEO_SUCCESS);
    await selectHomeContext();
    await $(SELECTORS.SUCCESS_MSG).waitForExist({ timeout: 10000 });

    await commonEnketoPage.setInputValue('Full name', 'Test Person Home Context');
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

  it('should store geolocation_log with is_home false and omit geolocation field when other context is captured',
    async () => {
      await commonPage.goToPeople(healthCenter._id);
      await commonPage.clickFastActionFAB({ actionId: personWithGeoType.id });

      await $(SELECTORS.GEO_CAPTURE_CONTAINER).waitForDisplayed();
      await mockGeoResolved(GEO_SUCCESS);
      await selectOtherContext();
      await $(SELECTORS.SUCCESS_MSG).waitForExist({ timeout: 10000 });

      await commonEnketoPage.setInputValue('Full name', 'Test Person Other Context');
      await genericForm.submitForm();
      await commonPage.waitForPageLoaded();
      await contactPage.waitForContactLoaded();

      const contactId = await contactPage.getCurrentContactId();
      const savedDoc = await utils.getDoc(contactId);

      expect(savedDoc.geolocation_log).to.exist;
      expect(savedDoc.geolocation_log).to.have.lengthOf(1);
      expect(savedDoc.geolocation_log[0].timestamp).to.be.greaterThan(0);
      expect(savedDoc.geolocation_log[0].is_home).to.be.false;
      expect(savedDoc.geolocation_log[0].recording).to.exist;
      expect(savedDoc.geolocation).to.not.exist;
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
      await $(SELECTORS.EDIT_BADGE).waitForExist();
    };

    it('should show edit-mode badge and radios when editing a contact with existing geolocation', async () => {
      await openEditForm();

      expect(await $(SELECTORS.EDIT_BADGE).isExisting()).to.be.true;
      expect(await $(SELECTORS.EDIT_BADGE_CONTEXT).isExisting()).to.be.true;
      expect(await $(SELECTORS.KEPT_RADIO).isExisting()).to.be.true;
      expect(await $(SELECTORS.CAPTURE_NEW_RADIO).isExisting()).to.be.true;
      expect(await $(SELECTORS.CONTEXT_OPTIONS).isExisting()).to.be.false;
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

    it('should show success message when GPS succeeds after capture-new is acknowledged', async () => {
      await openEditForm();

      await mockGeoResolved(GEO_SUCCESS);
      await $(SELECTORS.CAPTURE_NEW_RADIO).click();
      await $(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX).waitForExist();
      await $(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX).click();

      await $(SELECTORS.SUCCESS_MSG).waitForExist({ timeout: 10000 });
      expect(await $(SELECTORS.RETRY_BTN).isExisting()).to.be.false;

      await genericForm.cancelForm();
      await modalPage.submit();
    });

    it('should revert to edit options with keep pre-selected when GPS fails after capture-new is acknowledged',
      async () => {
        await openEditForm();

        await mockGeoResolved(GEO_FAILURE);
        await $(SELECTORS.CAPTURE_NEW_RADIO).click();
        await $(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX).waitForExist();
        await $(SELECTORS.EDIT_ACKNOWLEDGE_CHECKBOX).click();

        await $(SELECTORS.RETRY_BTN).waitForExist({ timeout: 10000 });
        await $(SELECTORS.ACKNOWLEDGE_CHECKBOX).click();
        await $(SELECTORS.SKIP_BTN).click();

        await $(SELECTORS.EDIT_OPTIONS).waitForDisplayed();
        expect(await $(SELECTORS.KEPT_RADIO).isSelected()).to.be.true;
      });
  });
});
