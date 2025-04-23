const commonPage = require('@page-objects/default/common/common.wdio.page');

const submitButton = () => $('.enketo .submit');
const cancelButton = () => $('.enketo .cancel');
const nextButton = () => $('button.btn.btn-primary.next-page');
const nameField = () => $('#report-form form [name="/data/name"]');
const errorContainer = () => $('.empty-selection');
const formTitle = () => $('.enketo form #form-title');
const currentFormView = () => $('.enketo form .current');
const validationErrors = () => $$('.invalid-required');
const waitForValidationErrorsToDisappear = () => browser.waitUntil(async () => !(await validationErrors()).length);
const waitForValidationErrors = () => browser.waitUntil(async () => (await validationErrors()).length);
const fieldByName = (formId, name) => $(`#report-form [name="/${formId}/${name}"]`);
const select2Selection = (label) => $(`label*=${label}`).$('.select2-selection');
const duplicateContacts = () => $$('#duplicate_contacts mat-expansion-panel');
const waitForDuplicateContacts = () => browser.waitUntil(async () => (await duplicateContacts()).length);
const acknowledgeCheckBox = () => $('#duplicate_contacts .acknowledge_label');
const openDuplicateButton = () => $('#duplicate_contacts button.btn-primary');

const nextPage = async (numberOfPages = 1, waitForLoad = true) => {
  if (waitForLoad) {
    if ((await validationErrors()).length) {
      await  formTitle().click(); // focus out to trigger re-validation
      await waitForValidationErrorsToDisappear();
    }
  }

  for (let i = 0; i < numberOfPages; i++) {
    const currentPageId = (await currentFormView()).elementId;
    await  nextButton().waitForDisplayed();
    await  nextButton().waitForClickable();
    await  nextButton().click();
    waitForLoad && await browser.waitUntil(async () => (await currentFormView()).elementId !== currentPageId);
  }
};

const selectContact = async (contactName, label, searchTerm = '') => {
  const searchField = await $('.select2-search__field');
  if (!await searchField.isDisplayed()) {
    await  select2Selection(label).click();
  }

  await searchField.setValue(searchTerm || contactName);
  await $('.select2-results__option.loading-results').waitForDisplayed({ reverse: true });
  const contact = await $(`.name*=${contactName}`);
  await contact.waitForDisplayed();
  await contact.click();

  await browser.waitUntil(async () => {
    return (await  select2Selection(label).getText()).toLowerCase().endsWith(contactName.toLowerCase());
  });
};

const clearSelectedContact = async (label) => {
  await  select2Selection(label).$('.select2-selection__clear').click();
  //To close the widget
  await formTitle().click();
};

const submitForm = async ({ waitForPageLoaded = true, ignoreValidationErrors = false } = {}) => {
  await formTitle().click();
  if (!ignoreValidationErrors) {
    await waitForValidationErrorsToDisappear();
  }
  await  submitButton().waitForClickable();
  await  submitButton().click();
  if (waitForPageLoaded) {
    await commonPage.waitForPageLoaded();
  }
};

const cancelForm = async () => {
  await  cancelButton().waitForClickable();
  await  cancelButton().click();
};

const getErrorMessage = async () => {
  await  errorContainer().waitForDisplayed();
  return await  errorContainer().getText();
};

const getFormTitle = async () => {
  await  formTitle().waitForDisplayed();
  return await  formTitle().getText();
};

const getDBObjectWidgetValues = async (field) => {
  const widget = $(`[data-contains-ref-target="${field}"] .selection`);
  await  widget.waitForClickable();
  await  widget.click();

  const dropdown = $('.select2-dropdown--below');
  await  dropdown.waitForDisplayed();
  const firstElement = $('.select2-results__options > li');
  await  firstElement.waitForClickable();

  const list = await $$('.select2-results__options > li');
  const contacts = [];
  for (const item of list) {
    contacts.push({
      name: await (item.$('.name').getText()),
      click: () => item.click(),
    });
  }

  return contacts;
};

const getDuplicateContactHeadings = async () => {
  await waitForDuplicateContacts();
  const duplicates = await duplicateContacts();
  return duplicates.map(async (duplicate) => {
    const name = await  duplicate.$('mat-panel-title').getText();
    const createdOn = await  duplicate.$('mat-panel-description').getText();
    return {
      name: name.split('\n')[1].trim(),
      createdOn: createdOn.split('\n')[1].trim()
    };
  });
};

const getDuplicateContactSummaryField = async (index, fieldName) => {
  const duplicateContact = (await duplicateContacts())[index];
  const contactSummary = await duplicateContact.$('#contact_summary');
  await duplicateContact.waitForClickable();
  await duplicateContact.click();
  await contactSummary.waitForDisplayed();
  const field = await contactSummary.$(`.cell.${fieldName}`);
  return (await field.$('p:not(.summary_label)')).getText();
};

const checkAcknowledgeDuplicatesBox = async () => {
  const checkBox = await acknowledgeCheckBox();
  await checkBox.waitForClickable();
  await checkBox.click();
};

const openDuplicateContact = async () => {
  const openButton = await openDuplicateButton();
  await openButton.waitForClickable();
  await openButton.click();
};

module.exports = {
  getFormTitle,
  getErrorMessage,
  cancelButton,
  waitForValidationErrors,
  waitForValidationErrorsToDisappear,
  nextPage,
  nameField,
  fieldByName,
  selectContact,
  clearSelectedContact,
  cancelForm,
  submitForm,
  currentFormView,
  formTitle,
  getDBObjectWidgetValues,
  getDuplicateContactHeadings,
  getDuplicateContactSummaryField,
  checkAcknowledgeDuplicatesBox,
  openDuplicateContact,
};
