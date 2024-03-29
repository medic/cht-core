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

const selectContact = async (contactName) => {
  const select2Selection = () => $('label*=What is the patient\'s name?').$('.select2-selection');
  await (await select2Selection()).click();
  const searchField = await $('.select2-search__field');
  await searchField.setValue(contactName);
  const contact = await $('.name');
  await contact.waitForDisplayed();
  await contact.click();
  await browser.waitUntil(async () => {
    return (await (await select2Selection()).getText()).toLowerCase().endsWith(contactName.toLowerCase());
  });
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

const getDBObjectWidgetValues = async (field) => {
  const widget = $(`[data-contains-ref-target="${field}"] .selection`);
  await (await widget).waitForClickable();
  await (await widget).click();

  const dropdown = $('.select2-dropdown--below');
  await (await dropdown).waitForDisplayed();
  const firstElement = $('.select2-results__options > li');
  await (await firstElement).waitForClickable();

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
  cancelForm,
  submitForm,
  currentFormView,
  formTitle,
  getDBObjectWidgetValues,
};
