const commonPage = require('@page-objects/default/common/common.wdio.page');
const genericFormPage = require('@page-objects/default/enketo/generic-form.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const customTypeFactory = require('@factories/cht/contacts/custom_type');
const utils = require('@utils');

describe('Unauthorized form', () => {

  const updateSettings = async (customPlaceType, permissions = {}) => {
    const settings = await utils.getSettings();
    const newSettings = {
      contact_types: [ ...settings.contact_types, customPlaceType ],
      permissions: { ...settings.permissions, ...permissions },
    };
    await utils.updateSettings(newSettings, true);
    await commonPage.sync(true);
  };

  const EXPECTED_UNAUTHORIZED_MESSAGE = 'Error loading form. Your user is not authorized to access this form. ' +
    'Talk to your administrator to correct this.';

  const PLACE_XML_PATH = `${__dirname}/forms/unauthorized-place.xml`;
  const customPlaceType = customTypeFactory.customType().build({}, { name: 'unauthorized-contact-form' });
  const customPlace = customTypeFactory.formsForTypes([ { id: customPlaceType.id } ], PLACE_XML_PATH)[0];

  const places = placeFactory.generateHierarchy();
  const offlineUser = userFactory.build({ place: places.get('district_hospital')._id, roles: [ 'chw' ] });

  before(async () => {
    customPlace.context = { permission: 'can_create_clinic' };
    await utils.saveDocs([ ...places.values(), customPlace ]);
    await utils.createUsers([ offlineUser ]);
    await loginPage.login(offlineUser);
  });

  afterEach(async () => await utils.revertSettings(true));

  it('should display unauthorized error message in reports tab when form expression does not match', async () => {
    await browser.url('/#/reports/add/pregnancy');
    await commonPage.waitForPageLoaded();

    expect(await genericFormPage.getErrorMessage()).to.equal(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should display unauthorized error message in contacts tab when user does not have form permission', async () => {
    await commonPage.goToPeople();
    await updateSettings(customPlaceType);

    await commonPage.goToUrl(`#/contacts/add/${customPlaceType.id}`);
    await commonPage.waitForPageLoaded();

    expect(await genericFormPage.getErrorMessage()).to.equal(EXPECTED_UNAUTHORIZED_MESSAGE);
  });

  it('should not display unauthorized error message in contacts tab when user has the form permission', async () => {
    await commonPage.goToPeople();
    await updateSettings(customPlaceType, { can_create_clinic: [ 'chw' ] });

    await commonPage.goToUrl(`#/contacts/add/${customPlaceType.id}`);
    await commonPage.waitForPageLoaded();

    expect(await genericFormPage.getFormTitle()).to.equal('contact.type.unauthorized-contact-form.new');
  });
});
