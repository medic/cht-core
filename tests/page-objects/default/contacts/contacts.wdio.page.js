const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const utils = require('@utils');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const mobileSearchPage = require('@page-objects/default-mobile/search/search.wdio.page');
const commonEnketoPage = require('@page-objects/default/enketo/common-enketo.wdio.page');

// search
const searchBox = () => $('.mm-search-bar-container input#freetext');

// menu
const menuContent = (testId) => $(`.mat-mdc-menu-content .mat-mdc-menu-item[test-id="${testId}"]`);
const exportButton = () => menuContent('export-contacts');
const editContactButton = () => menuContent('edit-contacts');
const deleteContactButton = () => menuContent('delete-contacts');

// left panel
const contactListSelector = '#contacts-list';
const contentRowSelector = `${contactListSelector} .content-row`;
const contactList = () => $('#contacts-list');
const contentRow = () => $(contentRowSelector);
const contentRows = () => $$(contentRowSelector);
const contactName = () => $$(`${contentRowSelector} .heading h4 span`);
const contactListLoadingStatus = () => $(`${contactListSelector} .loading-status`);

// right panel
const emptySelection = () => $('contacts-content .empty-selection');
const childrenCards = () => $$('.right-pane .card.children');
const contactCardTitle = () => $('.inbox .content-pane .material .body .action-header');

// card section
const contactCardName = () => $('h2[test-id="contact-name"]');
const contactCardIcon = (name) => $(`.card .heading .resource-icon[title="medic-${name}"]`);
const contactSummaryContainer = () => $('#contact_summary');
const contactMedicID = () => $('#contact_summary .cell.patient_id > div > p');
const contactDeceasedStatus = () => $('div[test-id="deceased-title"]');
const contactMuted = () => $('.heading-content .muted');

// people section
const primaryContactName = () => $('i[title="Primary contact"]').nextElement();
const rhsPeopleListSelector = () => $$('.card.children.persons h4 span');

// task section
const TASK_FILTER_SELECTOR = '.card.tasks .table-filter a';
const RHS_TASK_LIST_SELECTOR = '.card.tasks mm-content-row h4 span';
const taskFilter = () => $(TASK_FILTER_SELECTOR);
const taskFilters = () => $$(TASK_FILTER_SELECTOR);
const rhsTaskListElement = () => $(RHS_TASK_LIST_SELECTOR);
const rhsTaskListElementList = () => $$(RHS_TASK_LIST_SELECTOR);

// reports section
const REPORT_FILTER_SELECTOR = '.card.reports .table-filter a';
const RHS_REPORT_LIST_SELECTOR = '.card.reports mm-content-row h4 span';
const reportFilter = () => $(REPORT_FILTER_SELECTOR);
const reportFilters = () => $$(REPORT_FILTER_SELECTOR);
const rhsReportListElement = () => $(RHS_REPORT_LIST_SELECTOR);
const rhsReportElementList = () => $$(RHS_REPORT_LIST_SELECTOR);

// custom card
const cardId = (cardTestId) => $(`div[test-id="${cardTestId}"]`);
const cardField = (cardTestId, fieldTestId) => cardId(cardTestId).$(`div[test-id="${fieldTestId}"] p.card-field-value`);

// pregnancy card
const PREG_CARD_TEST_ID = 'contact.profile.pregnancy.active';
const pregnancyCard = () => cardId(PREG_CARD_TEST_ID);
const weeksPregnant = () => cardField(PREG_CARD_TEST_ID, 'Weeks Pregnant');
const edd = () => cardField(PREG_CARD_TEST_ID, 'contact.profile.edd');
const highRisk = () => cardId(PREG_CARD_TEST_ID).$('div[test-id="contact.profile.risk.high"] label');
const nextANCVisit = () => cardField(PREG_CARD_TEST_ID, 'contact.profile.anc.next');

// pregnancy card
const DEATH_CARD_TEST_ID = 'contact.profile.death.title';
const deathCard = () => cardId(DEATH_CARD_TEST_ID);
const deathDate = () => cardField(DEATH_CARD_TEST_ID, 'contact.profile.death.date');
const deathPlace = () => cardField(DEATH_CARD_TEST_ID, 'contact.profile.death.place');

const search = async (query) => {
  if (!await (await searchBox()).isDisplayed()) {
    await mobileSearchPage.performSearch(query);
  } else {
    await searchPage.performSearch(query);
  }
};

const findRowByText = async (text) => {
  for (const row of await contentRows()) {
    if ((await row.getText()) === text) {
      return row;
    }
  }
};

const selectLHSRowByText = async (text, executeSearch = true) => {
  await commonPage.waitForLoaderToDisappear();
  if (executeSearch) {
    await search(text);
  }
  await browser.waitUntil(async () => await findRowByText(text));
  const row = await findRowByText(text);
  if (!row) {
    throw new Error(`Contact "${text}" was not found`);
  }
  await row.waitForClickable();
  await row.click();
  await waitForContactLoaded();
};

const selectRHSRowById = async (id) => {
  const contact = await $(`.card.children.persons .content-row > a[href="#/contacts/${id}"]`);
  await contact.waitForClickable();
  await contact.click();
  await waitForContactLoaded();
};

const getReportFiltersText = async () => {
  await (await reportFilter()).waitForDisplayed();
  return (await reportFilters()).map(filter => filter.getText());
};

const getReportTaskFiltersText = async () => {
  await (await taskFilter()).waitForDisplayed();
  return await (await taskFilters()).map(filter => filter.getText());
};

const waitForContactLoaded = async (type) => {
  type && await (await contactCardIcon(type)).waitForDisplayed();
  await (await contactCardName()).waitForDisplayed();
  await (await contactSummaryContainer()).waitForDisplayed();
};

const waitForContactUnloaded = async () => {
  await (await emptySelection()).waitForDisplayed();
};

const addPlace = async ({
  type: typeValue = 'district_hospital',
  placeName: placeNameValue = 'District Test',
  contactName: contactNameValue = 'Person1',
  dob: dobValue = '2000-01-01',
  phone: phoneValue = '',
  sex: sexValue = 'Female',
  role: roleValue = 'CHW',
  externalID: externalIDValue = '12345678',
  notes: notesValue = 'Some test notes',
} = {},
rightSideAction = true,) => {

  if (rightSideAction) {
    await commonPage.clickFastActionFAB({ actionId: typeValue });
  } else {
    await commonPage.clickFastActionFlat({ waitForList: false });
  }
  await commonEnketoPage.selectRadioButton('Set the Primary Contact', 'Create a new person');
  await commonEnketoPage.setInputValue('Full Name', contactNameValue);
  await commonEnketoPage.setInputValue('Phone Number', phoneValue);
  await commonEnketoPage.setDateValue('Age', dobValue);
  await commonEnketoPage.selectRadioButton('Sex', sexValue);
  await commonEnketoPage.selectRadioButton('Role', roleValue);
  await genericForm.nextPage();
  await commonEnketoPage.selectRadioButton(
    'Would you like to name the place after the primary contact:',
    'No, I want to name it manually'
  );
  await commonEnketoPage.setInputValue('Name', placeNameValue);
  await commonEnketoPage.setInputValue('External ID', externalIDValue);
  await commonEnketoPage.setTextareaValue('Notes', notesValue);
  await genericForm.submitForm({ waitForPageLoaded: false });
  const dashedType = typeValue.replace('_', '-');
  await waitForContactLoaded(dashedType);
};

const addPerson = async ({
  name: nameValue = 'Person1',
  dob: dobValue = '2000-01-01',
  phone: phoneValue = '',
  sex: sexValue = 'Female',
  role: roleValue = 'CHW',
  externalID: externalIDValue = '12345678',
  notes: notesValue = 'Some test notes',
} = {}, waitForSentinel = true) => {

  const type = 'person';
  await commonPage.clickFastActionFAB({ actionId: type });
  await commonEnketoPage.setInputValue('Full name', nameValue);
  await commonEnketoPage.setInputValue('Phone Number', phoneValue);
  await commonEnketoPage.selectRadioButton('Sex', sexValue);
  await commonEnketoPage.selectRadioButton('Role', roleValue);
  await commonEnketoPage.setDateValue('Age', dobValue);
  await commonEnketoPage.setInputValue('External ID', externalIDValue);
  await commonEnketoPage.setTextareaValue('Notes', notesValue);
  await genericForm.submitForm();
  if (waitForSentinel) {
    await sentinelUtils.waitForSentinel();
  }
  await (await contactCardIcon(type)).waitForDisplayed();
  return (await contactCardName()).getText();
};

const editPerson = async (currentName, { name, phone, dob }) => {
  await selectLHSRowByText(currentName);
  await waitForContactLoaded();
  await commonPage.openMoreOptionsMenu();
  await (await editContactButton()).waitForClickable();
  await (await editContactButton()).click();
  await (await genericForm.nextPage());

  if (name !== undefined) {
    await commonEnketoPage.setInputValue('Full name', name);
  }
  if (phone !== undefined) {
    await commonEnketoPage.setInputValue('Phone Number', phone);
  }
  if (dob !== undefined) {
    await commonEnketoPage.setDateValue('Age', dob);
  }
  await genericForm.formTitle().click();
  await genericForm.submitForm();
};

const editPersonName = async (name, updatedName) => {
  await editPerson(name, { name: updatedName });
  return (await contactCardName()).getText();
};

const deletePerson = async () => {
  await commonPage.openMoreOptionsMenu();
  await (await deleteContactButton()).waitForClickable();
  await (await deleteContactButton()).click();
  await modalPage.submit();
};

const getContactSummaryField = async (fieldName) => {
  await (await contactSummaryContainer()).waitForDisplayed();
  const field = await (await contactSummaryContainer()).$(`.cell.${fieldName.toLowerCase().replace(/\./g, '\\.')}`);
  return await (await field.$('p')).getText();
};

const getPrimaryContactName = async () => {
  return await (await primaryContactName()).getText();
};

const getAllLHSContactsNames = async () => {
  await (await contentRow()).waitForDisplayed();
  return commonPage.getTextForElements(contactName);
};

const getAllRHSPeopleNames = () => {
  return commonPage.getTextForElements(rhsPeopleListSelector);
};

const getAllRHSReportsNames = async () => {
  await (await rhsReportListElement()).waitForDisplayed();
  return commonPage.getTextForElements(rhsReportElementList);
};

const getAllRHSTaskNames = async () => {
  await (await rhsTaskListElement()).waitForDisplayed();
  return commonPage.getTextForElements(rhsTaskListElementList);
};

const allContactsList = async () => {
  const parentCards = await childrenCards();

  return parentCards.map(async (parent) => ({
    heading: await (await parent.$('h3')).getText(),
    contactNames: await (await parent.$$('.children h4 span')).map(filter => filter.getText())
  }));
};

const editPlace = async (currentName, editedName) => {
  await selectLHSRowByText(currentName, true);
  await waitForContactLoaded();

  await commonPage.openMoreOptionsMenu();
  await (await editContactButton()).waitForClickable();
  await (await editContactButton()).click();

  await commonEnketoPage.setInputValue('Name of this', editedName);
  await genericForm.submitForm();
};

const openFormWithWarning = async (formId) => {
  await commonPage.clickFastActionFAB({ actionId: formId });
  return modalPage.getModalDetails();
};

const openReport = async () => {
  await commonPage.toggleActionbar(true);
  await (await rhsReportListElement()).waitForDisplayed();
  await (await rhsReportListElement()).click();
  await commonPage.toggleActionbar();
};

const getContactCardTitle = async () => {
  await contactCardTitle().waitForDisplayed();
  return (await contactCardTitle()).getText();
};

const getContactInfoName = async () => {
  await contactCardName().waitForDisplayed();
  return (await contactCardName()).getText();
};

const getContactMedicID = async () => {
  await contactMedicID().waitForDisplayed();
  return (await contactMedicID()).getText();
};

const getContactDeceasedStatus = async () => {
  const deceasedStatus = await contactDeceasedStatus();
  await deceasedStatus.waitForDisplayed();
  return await deceasedStatus.getText();
};

const getPregnancyCardInfo = async () => {
  await pregnancyCard().waitForDisplayed();
  return {
    weeksPregnant: await weeksPregnant().getText(),
    deliveryDate: await edd().getText(),
    risk: await highRisk().getText(),
    ancVisit: await nextANCVisit().getText(),
  };
};

const getDeathCardInfo = async () => {
  await deathCard().waitForDisplayed();
  return {
    deathDate: await deathDate().getText(),
    deathPlace: await deathPlace().getText(),
  };
};

const exportContacts = async () => {
  await commonPage.openMoreOptionsMenu();
  await (await exportButton()).waitForClickable();
  await (await exportButton()).click();
};

const getCurrentContactId = async () => {
  const currentUrl = await browser.getUrl();
  const contactBaseUrl = utils.getBaseUrl() + 'contacts/';
  if (!currentUrl.startsWith(contactBaseUrl)) {
    return;
  }

  return currentUrl.slice(contactBaseUrl.length);
};

const getContactListLoadingStatus = async () => {
  await (await contactListLoadingStatus()).waitForDisplayed();
  return await (await contactListLoadingStatus()).getText();
};

const getDisplayedContactsNames = async () => {
  const contacts = [];
  for (const row of await contentRows()) {
    contacts.push(await row.getText());
  }
  return contacts;
};

const getCurrentPersonEditFormValues = async (sexValue, roleValue) => {
  return {
    name: await commonEnketoPage.getInputValue('Full name'),
    shortName: await commonEnketoPage.getInputValue('Short name'),
    dateOfBirth: await commonEnketoPage.getInputValue('Age'),
    sex: await commonEnketoPage.isRadioButtonSelected('Sex', sexValue),
    role: await commonEnketoPage.isRadioButtonSelected('Role', roleValue),
    phone: await commonEnketoPage.getInputValue('Phone Number'),
    externalId: await commonEnketoPage.getInputValue('External ID'),
    notes: await commonEnketoPage.getTextareaValue('Notes'),
  };
};

module.exports = {
  genericForm,
  selectLHSRowByText,
  selectRHSRowById,
  reportFilters,
  getReportFiltersText,
  getReportTaskFiltersText,
  contactList,
  getAllLHSContactsNames,
  addPerson,
  addPlace,
  getPrimaryContactName,
  getAllRHSPeopleNames,
  waitForContactLoaded,
  waitForContactUnloaded,
  contactCardName,
  editPerson,
  editPersonName,
  editPlace,
  exportContacts,
  getContactSummaryField,
  getAllRHSReportsNames,
  rhsReportListElement,
  getAllRHSTaskNames,
  rhsTaskListElement,
  deletePerson,
  allContactsList,
  childrenCards,
  openReport,
  getContactCardTitle,
  getContactInfoName,
  getContactMedicID,
  getContactDeceasedStatus,
  contactCardIcon,
  editContactButton,
  pregnancyCard,
  getPregnancyCardInfo,
  deathCard,
  getDeathCardInfo,
  contactMuted,
  openFormWithWarning,
  getContactListLoadingStatus,
  getCurrentContactId,
  getDisplayedContactsNames,
  getCurrentPersonEditFormValues,
};
