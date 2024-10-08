
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const searchPage = require('@page-objects/default/search/search.wdio.page');

const utils = require('@utils');
const { resizeWindowForScreenshots, generateScreenshot } = require('@utils/screenshots');

describe('Creating and editing contacts and users', () => {
  const healthFacilityName = 'Nairobi North Facility';

  before(async () => {
    await resizeWindowForScreenshots();
    await loginPage.cookieLogin();
    await commonPage.goToPeople();
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
  });

  afterEach(async () => {
    await commonPage.goToPeople();
  });

  describe('Creating and editing contacts and users', () => {
    it('should create health facility, chw area and chw '+
      'chw supervisor and chw user', async () => {
      await generateScreenshot('new-facility', 'select-new-facility');
      await commonPage.clickFastActionFlat({ waitForList: false });
      await commonEnketoPage.selectRadioButton('Set the Primary Contact', 'Skip this step');
      await generateScreenshot('new-facility', 'skip-primary-contact');
      await genericForm.nextPage();
      await commonEnketoPage.setInputValue('Name', healthFacilityName);
      await generateScreenshot('new-facility', 'enter-facility-name');
      await genericForm.submitForm({ waitForPageLoaded: false });
      await contactPage.waitForContactLoaded();
      await commonPage.hideSnackbar();
      await generateScreenshot('new-facility', 'created-facility');

      await commonPage.clickFastActionFAB({ waitForList: false });
      await browser.pause(500);
      await generateScreenshot('new-chw-area', 'new-chw-area');
      await commonPage.closeFastActionList();
      await commonPage.clickFastActionFAB({ actionId: 'health_center' });
      await commonEnketoPage.selectRadioButton('Set the Primary Contact', 'Create a new person');
      await commonEnketoPage.setInputValue('Full Name', 'Jane Doe');
      await generateScreenshot('new-chw-area', 'create-new-person');
      await commonEnketoPage.setDateValue('Age', '1990-01-21');
      await commonEnketoPage.selectRadioButton('Sex', 'Male');
      await commonEnketoPage.selectRadioButton('Role', 'CHW');
      await generateScreenshot('new-chw-area', 'fill-required-fields');
      await genericForm.nextPage();
      await commonEnketoPage.selectRadioButton(
        'Would you like to name the place after the primary contact:',
        'Yes'
      );
      await generateScreenshot('new-chw-area', 'name-after-primary-contact');
      await genericForm.submitForm({ waitForPageLoaded: false });
      await contactPage.waitForContactLoaded();
      await commonPage.hideSnackbar();
      await generateScreenshot('new-chw-area', 'created-chw-area');

      await contactPage.selectLHSRowByText(healthFacilityName);
      await searchPage.clearSearch();
      await commonPage.clickFastActionFAB({ waitForList: false });
      await browser.pause(500);
      await generateScreenshot('new-chw-supervisor', 'new-person');
      await commonPage.closeFastActionList();
      await commonPage.clickFastActionFAB({ actionId: 'person' });
      await commonEnketoPage.setInputValue('Full name', 'John Doe');
      await generateScreenshot('new-chw-supervisor', 'belongs-to');
      await commonEnketoPage.selectRadioButton('Sex', 'male');
      await commonEnketoPage.setDateValue('Age', '1988-03-07');
      await genericForm.submitForm();
      await contactPage.selectLHSRowByText(healthFacilityName);
      await searchPage.clearSearch();
      await commonPage.openMoreOptionsMenu();
      await browser.pause(500);
      await generateScreenshot('new-chw-supervisor', 'edit-facility');
      await (await contactPage.menuSelectors.editContactButton()).waitForClickable();
      await (await contactPage.menuSelectors.editContactButton()).click();
      await generateScreenshot('new-chw-supervisor', 'set-primary-contact');
    });
  });
});
