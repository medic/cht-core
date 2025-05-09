const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const usersAdminPage = require('@page-objects/default/users/user.wdio.page');

const utils = require('@utils');
const { generateScreenshot } = require('@utils/screenshots');

describe('Creating and editing contacts and users', () => {
  const healthFacilityName = 'Nairobi North Facility';

  before(async () => {
    await loginPage.cookieLogin();
    await commonPage.goToPeople();
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
  });

  afterEach(async () => {
    await commonPage.goToPeople();
  });

  it('should create health facility, chw area and chw '+
    'chw supervisor and chw user', async () => {
    //create health facility
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

    //create chw area and chw
    await commonPage.clickFastActionFAB({ waitForList: false });
    await browser.pause(150); // Waiting for animation to avoid blurry screenshots
    await generateScreenshot('new-chw-area', 'new-chw-area');
    await commonPage.closeFastActionList();
    await commonPage.clickFastActionFAB({ actionId: 'health_center' });
    await commonEnketoPage.selectRadioButton('Set the Primary Contact', 'Create a new person');
    await commonEnketoPage.setInputValue('Full Name', 'Jane Doe');
    await commonEnketoPage.selectRadioButton('Set the Primary Contact', 'Create a new person');
    await generateScreenshot('new-chw-area', 'create-new-person');
    await commonEnketoPage.setDateValue('Age', '1990-01-21');
    await commonEnketoPage.selectRadioButton('Sex', 'Male');
    await commonEnketoPage.scrollToQuestion('Age');
    await generateScreenshot('new-chw-area', 'fill-required-fields');
    await commonEnketoPage.selectRadioButton('Role', 'CHW');
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

    //create chw supervisor
    await contactPage.selectLHSRowByText(healthFacilityName);
    await searchPage.clearSearch();
    await commonPage.clickFastActionFAB({ waitForList: false });
    await browser.pause(150); // Waiting for animation to avoid blurry screenshots
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
    await browser.pause(150); // Waiting for animation to avoid blurry screenshots
    await generateScreenshot('new-chw-supervisor', 'edit-facility');
    await commonPage.accessEditOption(true);
    await contactPage.openPrimaryContactSearchDropdown();
    await contactPage.inputPrimaryContactSearchValue('John');
    await generateScreenshot('new-chw-supervisor', 'set-primary-contact');
    await contactPage.selectPrimaryContactSearchFirstResult();
    await contactPage.genericForm.submitForm();
    await contactPage.selectLHSRowByText(healthFacilityName);
    await searchPage.clearSearch();
    await generateScreenshot('new-chw-supervisor', 'primary-contact-selected');

    //create chw user
    await commonPage.openHamburgerMenu();
    await generateScreenshot('new-chw-user', 'app-settings');
    await commonPage.openAppManagement();
    await usersAdminPage.goToAdminUser();
    await usersAdminPage.addUserButton().waitForDisplayed();
    await generateScreenshot('new-chw-user', 'add-user');
    await usersAdminPage.openAddUserDialog();
    await usersAdminPage.inputAddUserFields(
      'Janet',
      '',
      'chw',
      `Jane Doe's Area`,
      'John Doe',
      'Secret_1'
    );
    await usersAdminPage.scrollToRole();
    await generateScreenshot('new-chw-user', 'fill-user-details');
  });
});
