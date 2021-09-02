const utils = require('../../utils');
const customTypeFactory = require('../../factories/cht/contacts/custom_type');
const placeFactory = require('../../factories/cht/contacts/place');
const login = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactsPage = require('../../page-objects/contacts/contacts.wdio.page');

const addPlace = 'Add place';
const addPerson = 'Add person';
let translations;
let forms;

// Custom Top level
const customTopLevel = customTypeFactory.customType().build();
const secondTopLevel = customTypeFactory.customType().build({}, { name: 'second-top-level' });
const customMidLevel = customTypeFactory.customType().build({ parents: [customTopLevel.id] }, { name: 'mid-level' });
const customLowLevel = customTypeFactory.customType().build({ parents: [customMidLevel.id] }, { name: 'low-level' });

// Custom child with parent set to cutomTopLevel to test RHS
const childPlaceToCustomTopLevel = customTypeFactory.customType()
  .build({ parents: [customMidLevel.id] }, { name: 'doctor-office' });

// Custom parent with multiple place childs
const firstChildPlaceToTopLevel = customTypeFactory.customType()
  .build({ parents: [customLowLevel.id] }, { name: 'first-child' });

const secondChildPlaceToTopLevel = customTypeFactory.customType()
  .build({ parents: [customLowLevel.id] }, { name: 'second-child' });

const customParentWithMultiplePersons = customTypeFactory.customType()
  .build({ parents: [customMidLevel.id] }, { name: 'custom-parent' });

const person1 = customTypeFactory.customType()
  .build({ parents: [customTopLevel.id], person: true }, { name: 'doctor' });
const person2 = customTypeFactory.customType()
  .build({ parents: [customParentWithMultiplePersons.id], person: true }, { name: 'patient' });
const person3 = customTypeFactory.customType()
  .build({ parents: [customParentWithMultiplePersons.id], person: true }, { name: 'nurse' });

describe('Creating custom places', () => {
  beforeEach(async () => {
    const contacts = [
      customTopLevel,
      customMidLevel,
      customLowLevel,
      childPlaceToCustomTopLevel,
      firstChildPlaceToTopLevel,
      secondChildPlaceToTopLevel,
      customParentWithMultiplePersons,
      person2,
      person3,
      person1
    ];
    translations = customTypeFactory.translationKeys(contacts);
    forms = customTypeFactory.formsForTypes(contacts);
    await utils.addTranslations('en', translations);
    await utils.updateSettings({ contact_types: contacts }, true);
    await utils.saveDocs(forms);
    await login.cookieLogin();
  });

  afterEach(async () => {
    await utils.deleteDocs(forms.map(form => form._id));
    await utils.revertDb([], true);
  });

  it('the LHS add place button should show the appropriate title', async () => {
    await login.cookieLogin();
    await commonPage.goToPeople();
    await expect(await contactsPage.leftAddPlace()).toHaveText(translations[customTopLevel.create_key]);
  });

  it('the LHS add place button should read add place when multiple places exist at the current level', async () => {
    const settings = await utils.getSettings();
    settings.contact_types.push(secondTopLevel);
    const forms = customTypeFactory.formsForTypes([secondTopLevel]);
    await utils.revertSettings(true);
    await utils.updateSettings({ contact_types: settings.contact_types }, true);
    await utils.saveDocs(forms);
    await login.cookieLogin();
    await commonPage.goToPeople();
    await expect(await contactsPage.leftAddPlace()).toHaveText(addPlace);
  });

  it('the RHS add place button should show the custom title', async () => {
    const ngoPlace = placeFactory.place().build({ name: 'NGO', type: 'contact', contact_type: customTopLevel.id });
    await utils.saveDoc(ngoPlace);
    await commonPage.goToPeople(ngoPlace._id);
    await expect(await contactsPage.rightAddPlace()).toHaveText(translations[customMidLevel.create_key]);
  });

  it('the RHS add place button should show the add place title', async () => {
    const lowLevel = placeFactory.place().build({ name: 'LowLevel', type: 'contact', contact_type: customLowLevel.id });
    await utils.saveDoc(lowLevel);
    await commonPage.goToPeople(lowLevel._id);
    await expect(await contactsPage.rightAddPlace()).toHaveText(addPlace);
  });

  it('should show the single add person button with the correct title', async () => {
    const ngoPlace = placeFactory.place().build({ name: 'NGO', type: 'contact', contact_type: customTopLevel.id });
    await utils.saveDoc(ngoPlace);
    await commonPage.goToPeople(ngoPlace._id);
    await expect(await contactsPage.rightAddPerson(person1.create_key)).toHaveText(translations[person1.create_key]);
  });

  it('should show the multi add person button with the correct title', async () => {
    const multiPerson = placeFactory.place()
      .build({ name: 'multiPerson', type: 'contact', contact_type: customParentWithMultiplePersons.id });
    await utils.saveDoc(multiPerson);
    await commonPage.goToPeople(multiPerson._id);
    await expect(await contactsPage.rightAddPersons()).toHaveText(addPerson);
  });

  it('should show custom places in their own list', async () => {
    const topLevel = placeFactory.place()
      .build({ name: 'topLevel', type: 'contact', contact_type: customTopLevel.id });
    const midLevel = placeFactory.place()
      .build({ name: 'midLevel', type: 'contact', contact_type: customMidLevel.id, parent: { _id: topLevel._id } });
    const lowLevel = placeFactory.place()
      .build({ name: 'lowlvl', type: 'contact', contact_type: customLowLevel.id, parent: { _id: topLevel._id } });
    await utils.saveDocs([topLevel, midLevel, lowLevel]);
    await commonPage.goToPeople(topLevel._id);
    const out = await contactsPage.getListOfContactsByType();
    await expect(out).toHaveText(addPerson);
  });
});
