const fs = require('fs');
const path = require('path');
const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const { CONTACT_TYPES } = require('@medic/constants');

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

    // Sanity check: verify the correct form loaded with our test fixture label
    await $('label*=Capture GPS Location').waitForDisplayed();

    // Check whether Enketo generated the geolocation widget CSS class
    const hasWidgetClass = await browser.execute(() => {
      return !!document.querySelector('.or-appearance-geolocation-capture');
    });
    expect(hasWidgetClass, 'Enketo should add or-appearance-geolocation-capture class').to.be.true;

    await commonEnketoPage.setInputValue('Full name', 'Test Person With Geo');
    await genericForm.submitForm();
    await commonPage.waitForPageLoaded();
    await contactPage.waitForContactLoaded();

    const contactId = await contactPage.getCurrentContactId();
    const savedDoc = await utils.getDoc(contactId);

    // The geolocation save pipeline runs regardless of GPS outcome (success or failure).
    expect(savedDoc.geolocation_log).to.exist;
    expect(savedDoc.geolocation_log).to.have.lengthOf(1);
    expect(savedDoc.geolocation_log[0].timestamp).to.be.greaterThan(0);
    expect(savedDoc.geolocation).to.exist;
    expect(savedDoc.geolocation_log[0].recording).to.deep.equal(savedDoc.geolocation);
  });
});
