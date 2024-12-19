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

const nextPage = async (numberOfPages = 1, waitForLoad = true) => {
  if (waitForLoad) {
    if ((await validationErrors()).length) {
      await (await formTitle()).click(); // focus out to trigger re-validation
      await waitForValidationErrorsToDisappear();
    }
  }

  for (let i = 0; i < numberOfPages; i++) {
    const currentPageId = (await currentFormView()).elementId;
    await (await nextButton()).waitForDisplayed();
    await (await nextButton()).waitForClickable();
    await (await nextButton()).click();
    waitForLoad && await browser.waitUntil(async () => (await currentFormView()).elementId !== currentPageId);
  }
};

const searchContact = async (label, searchTerm) => {
  const searchField = await $('.select2-search__field');
  if (!await searchField.isDisplayed()) {
    await (await select2Selection(label)).click();
  }

  await searchField.setValue(searchTerm);
  await $('.select2-results__option.loading-results').waitForDisplayed({ reverse: true });
};

const selectContact = async (contactName, label, searchTerm = '') => {
  await searchContact(label, searchTerm || contactName);
  const contact = await $(`.name*=${contactName}`);
  await contact.waitForDisplayed();
  await contact.click();

  await browser.waitUntil(async () => {
    return (await (await select2Selection(label)).getText()).toLowerCase().endsWith(contactName.toLowerCase());
  });
};

const clearSelectedContact = async (label) => {
  await (await select2Selection(label)).$('.select2-selection__clear').click();
};

const submitForm = async ({ waitForPageLoaded = true, ignoreValidationErrors = false } = {}) => {
  await formTitle().click();
  if (!ignoreValidationErrors) {
    await waitForValidationErrorsToDisappear();
  }
  await (await submitButton()).waitForClickable();
  await (await submitButton()).click();
  if (waitForPageLoaded) {
    await commonPage.waitForPageLoaded();
  }
};

const cancelForm = async () => {
  await (await cancelButton()).waitForClickable();
  await (await cancelButton()).click();
};

const getErrorMessage = async () => {
  await (await errorContainer()).waitForDisplayed();
  return await (await errorContainer()).getText();
};

const getFormTitle = async () => {
  await (await formTitle()).waitForDisplayed();
  return await (await formTitle()).getText();
};

const getDBObjectWidgetValues = async () => {
  const dropdown = $('.select2-dropdown--below');
  await (await dropdown).waitForDisplayed();
  const firstElement = $('.select2-results__options > li');
  await (await firstElement).waitForClickable();

  const list = await $$('.select2-results__options > li');
  const contacts = [];
  for (const item of list) {
    const itemName = item.$('.name');
    if (!(await itemName.isExisting())) {
      continue;
    }
    contacts.push({
      name: await itemName.getText(),
      click: () => item.click(),
    });
  }

  return contacts;
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
  searchContact,
  selectContact,
  clearSelectedContact,
  cancelForm,
  submitForm,
  currentFormView,
  formTitle,
  getDBObjectWidgetValues,
};
