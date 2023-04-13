const utils = require('../../../utils');
const customTypeFactory = require('../../../factories/cht/contacts/custom_type');
const placeFactory = require('../../../factories/cht/contacts/place');
const login = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const contactsPage = require('../../../page-objects/default/contacts/contacts.wdio.page');

const addPlace = 'New Place';
let translations;
let forms;

//Custom Hierarchy
// customTopLevel -> person1
//    customMidLevel -> childPlaceToCustomTopLevel
//        customLowLevel -> firstChildPlaceToTopLevel, secondChildPlaceToTopLevel
//        customParentWithMultiplePersons -> person2, person3
// secondTopLevel

const customTopLevel = customTypeFactory.customType().build();
const secondTopLevel = customTypeFactory.customType().build({}, { name: 'second-top-level' });
const customMidLevel = customTypeFactory.customType().build({ parents: [customTopLevel.id] }, { name: 'mid-level' });
const customLowLevel = customTypeFactory.customType().build({ parents: [customMidLevel.id] }, { name: 'low-level' });

const childPlaceToCustomMidLevel = customTypeFactory.customType()
  .build({ parents: [customMidLevel.id] }, { name: 'doctor-office' });

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
  const ngoCreateXML = `${__dirname}/forms/ngo-create.xml`;

  beforeEach(async () => {
    const contacts = [
      customTopLevel,
      customMidLevel,
      customLowLevel,
      childPlaceToCustomMidLevel,
      firstChildPlaceToTopLevel,
      secondChildPlaceToTopLevel,
      customParentWithMultiplePersons,
      person2,
      person3,
      person1
    ];
    translations = customTypeFactory.translationKeys(contacts);
    forms = customTypeFactory.formsForTypes(contacts, ngoCreateXML);
    await utils.addTranslations('en', translations);
    await utils.updateSettings({ contact_types: contacts }, true);
    await utils.saveDocs(forms);
    await login.cookieLogin();
  });

  afterEach(async () => {
    await utils.deleteDocs(forms.map(form => form._id));
    await utils.revertDb([/^form:/], true);
  });

  it('the LHS button should show the appropriate label when only one action', async () => {
    await login.cookieLogin();
    await commonPage.goToPeople();
    expect(await commonPage.getFastActionFlatText()).to.contain(translations[customTopLevel.create_key]);
  });

  it('the LHS button should show the appropriate label when multiple places exist at the current level', async () => {
    const settings = await utils.getSettings();
    settings.contact_types.push(secondTopLevel);
    const forms = customTypeFactory.formsForTypes([secondTopLevel], ngoCreateXML);
    await utils.revertSettings(true);
    await utils.updateSettings({ contact_types: settings.contact_types }, true);
    await utils.saveDocs(forms);
    await login.cookieLogin();
    await commonPage.goToPeople();
    expect(await commonPage.getFastActionFlatText()).to.contain(addPlace);
  });

  it('the RHS button should show the action with custom label', async () => {
    const ngoPlace = placeFactory.place().build({ name: 'NGO', type: 'contact', contact_type: customTopLevel.id });
    await utils.saveDoc(ngoPlace);
    await commonPage.goToPeople(ngoPlace._id);
    const actionText = await commonPage.getFastActionFABTextById(customMidLevel.id);
    expect(actionText).to.contain(translations[customMidLevel.create_key]);
  });

  it('the RHS button show the appropriate label when multiple places exist at the current level', async () => {
    const lowLevel = placeFactory.place().build({ name: 'LowLevel', type: 'contact', contact_type: customLowLevel.id });
    await utils.saveDoc(lowLevel);
    await commonPage.goToPeople(lowLevel._id);
    const firstPlaceText = await commonPage.getFastActionFABTextById(firstChildPlaceToTopLevel.id);
    await commonPage.closeFastActionList();
    const secondPlaceText = await commonPage.getFastActionFABTextById(secondChildPlaceToTopLevel.id);
    expect(firstPlaceText).to.contain(translations[firstChildPlaceToTopLevel.create_key]);
    expect(secondPlaceText).to.contain(translations[secondChildPlaceToTopLevel.create_key]);
  });

  it('should show the single add person button with the correct label', async () => {
    const ngoPlace = placeFactory.place().build({ name: 'NGO', type: 'contact', contact_type: customTopLevel.id });
    await utils.saveDoc(ngoPlace);
    await commonPage.goToPeople(ngoPlace._id);
    expect(await commonPage.getFastActionFABTextById(person1.id)).to.contain(translations[person1.create_key]);
  });

  it('should show the multi person actions with the correct label', async () => {
    const multiPerson = placeFactory.place()
      .build({ name: 'multiPerson', type: 'contact', contact_type: customParentWithMultiplePersons.id });
    await utils.saveDoc(multiPerson);
    await commonPage.goToPeople(multiPerson._id);
    expect(await commonPage.getFastActionFABTextById(person2.id)).to.contain(translations[person2.create_key]);
    await commonPage.closeFastActionList();
    expect(await commonPage.getFastActionFABTextById(person3.id)).to.contain(translations[person3.create_key]);
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
    const displayedListOfContacts = await contactsPage.allContactsList();
    const expected = [
      {
        heading: 'low-level Plural',
        contactNames: ['lowlvl']
      },
      {
        heading: 'mid-level Plural',
        contactNames: ['midLevel']
      },
    ];
    expect(displayedListOfContacts).to.deep.equal(expected);
  });
});
