const utils = require('../../utils');
const customTypeFactory = require('../../factories/cht/contacts/custom_type');
const placeFactory = require('../../factories/cht/contacts/place');
const login = require('../../page-objects/login/login.wdio.page');
const commonPage = require('../../page-objects/common/common.wdio.page');
const contactsPage = require('../../page-objects/contacts/contacts.wdio.page');

describe('Creating custom places', () => {
  beforeEach(async () => {
    await utils.revertDb([], true);
  });

  it('the LHS add place button should show the appropriate title', async () => {
    const customTypes = customTypeFactory.customTypes();
    const translations = customTypeFactory.translationKeys(customTypes);
    const docs = customTypeFactory.formsForTypes(customTypes);
    await utils.addTranslations('en', translations);
    await utils.updateSettings({ contact_types:  customTypes }, true);
    await utils.saveDocs(docs);
    await login.cookieLogin();
    await commonPage.goToPeople();
    await expect(await contactsPage.leftAddPlace()).toHaveText(translations[customTypes[0].create_key]);
  });

  it('the LHS add place button should read add place when multiple places exist at the current level', async () => {
    const settings = await utils.getSettings();
    const customType = customTypeFactory.customType().build();
    settings.contact_types.push(customType);
    await utils.updateSettings({ contact_types: settings.contact_types }, true);
    await login.cookieLogin();
    await commonPage.goToPeople();
    await expect(await contactsPage.leftAddPlace()).toHaveText('Add place');
  });

  it('the RHS add place button should show the custom title', async () => {
    const ngo = customTypeFactory.customType().build();
    const docOffice = customTypeFactory.customType().build({}, {name: 'doctor-office'});
    docOffice.parents.push(ngo.id);
    const contactTypes = [ngo, docOffice];
    const docs = customTypeFactory.formsForTypes(contactTypes);
    await utils.saveDocs([docs[1]]);
    const translations = customTypeFactory.translationKeys(contactTypes);
    await utils.addTranslations('en', translations );
    await utils.updateSettings({ contact_types: contactTypes }, true);
    const ngoPlace = placeFactory.place().build({ name: 'First NGO', type: 'contact', contact_type: 'ngo' });
    await utils.saveDoc(ngoPlace);
    await login.cookieLogin();
    await commonPage.goToPeople(ngoPlace._id);
    await expect(await contactsPage.rightAddPlace()).toHaveText(translations[docOffice.create_key]);
  });

  it('the RHS add place button should show the add place title', async () => {
    const ngo = customTypeFactory.customType().build();
    const docOffice = customTypeFactory.customType().build({}, {name: 'doctor-office'});
    const dentistOffice = customTypeFactory.customType().build({}, {name: 'dentist-office'});
    docOffice.parents.push(ngo.id);
    dentistOffice.parents.push(ngo.id);
    const contactTypes = [ngo, docOffice,dentistOffice];
    const docs = customTypeFactory.formsForTypes(contactTypes);
    await utils.saveDocs([docs[2]]);
    const translations = customTypeFactory.translationKeys(contactTypes);
    await utils.addTranslations('en', translations );
    await utils.updateSettings({ contact_types: contactTypes }, true);
    const ngoPlace = placeFactory.place().build({ name: 'First NGO', type: 'contact', contact_type: 'ngo' });
    await utils.saveDoc(ngoPlace);
    await login.cookieLogin();
    await commonPage.goToPeople(ngoPlace._id);
    await expect(await contactsPage.rightAddPlace()).toHaveText('Add place');
  });
});
