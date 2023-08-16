const ENTER = '\uE007';

const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const utils = require('@utils');
const modalPage = require('@page-objects/default/common/modal.wdio.page');

const searchBox = () => $('.mm-search-bar-container input#freetext');
const contentRowSelector = '#contacts-list .content-row';
const contentRow = () => $(contentRowSelector);
const contentRows = () => $$(contentRowSelector);
const contactName = () => $$(`${contentRowSelector} .heading h4 span`);
const reportFilterSelector = '.card.reports .table-filter a';
const reportFilter = () => $(reportFilterSelector);
const reportFilters = () => $$(reportFilterSelector);
const taskFilterSelector = '.card.tasks .table-filter a';
const taskFilter = () => $(taskFilterSelector);
const taskFilters = () => $$(taskFilterSelector);
const contactList = () => $('#contacts-list');
const contactListLoadingStatus = () => $('#contacts-list .loading-status');
const newPlaceName = () => $('[name="/data/init/custom_place_name"]');
const newPrimaryContactName = () => $('[name="/data/contact/name"]');
const newPrimaryContactButton = () => $('[name="/data/init/create_new_person"][value="new_person"]');
const dateOfBirthField = () => $('[placeholder="yyyy-mm-dd"]');
const sexField = (type, value) => $(`[data-name="/data/${type}/sex"][value="${value}"]`);
const roleField = (type, role) => $(`span[data-itext-id="/data/${type}/role/${role}:label"].active`);
const phoneField = () => $('input.ignore[type="tel"]');
const personName = () => $('[name="/data/person/name"]');
const topContact = () => $('#contacts-list > ul > li:nth-child(1) > a > div.content > div > h4 > span');
const name = () => $('.children h4 span');
const externalIdField = (place) => $(`[name="/data/${place}/external_id"]`);
const notes = (place) => $(`[name="/data/${place}/notes"]`);
const writeNamePlace = (place) => $(`[name="/data/${place}/is_name_generated"][value="false"]`);
const contactCard = () => $('.card h2');
const contactCardIcon = (name) => $(`.card .heading .resource-icon[title="medic-${name}"]`);
const CARD = '.content-pane .meta > div > .card ';
const pregnancyLabel = () => $(`${CARD} .action-header h3`);
const visitLabel = () => $(`${CARD} .row label`);
const numberOfReports = () => $((`${CARD} .row p`));

const rhsPeopleListSelector = () => $$('.card.children.persons h4 span');
const rhsReportListSelector = '.card.reports mm-content-row h4 span';
const rhsTaskListSelector = '.card.tasks mm-content-row h4 span';
const rhsTaskListElement = () => $(rhsTaskListSelector);
const rhsTaskListElementList = () => $$(rhsTaskListSelector);
const rhsReportListElement = () => $(rhsReportListSelector);
const rhsReportElementList = () => $$(rhsReportListSelector);

const contactSummaryContainer = () => $('#contact_summary');
const emptySelection = () => $('contacts-content .empty-selection');
const exportButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="export-contacts"]');
const editContactButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="edit-contacts"]');
const deleteContactButton = () => $('.mat-mdc-menu-content .mat-mdc-menu-item[test-id="delete-contacts"]');
const deleteConfirmationModalButton = () => $('.modal-footer a.btn-danger');
const contactCards = () => $$('.card.children');
const districtHospitalName = () => $('[name="/data/district_hospital/name"]');
const childrenCards = () => $$('.right-pane .card.children');
const contactCardTitle = () => $('.inbox .content-pane .material .body .action-header');
const contactInfoName = () => $('h2[test-id="contact-name"]');
const contactMedicID = () => $('#contact_summary .cell.patient_id > div > p');
const contactDeceasedStatus = () => $('div[test-id="deceased-title"]');
const contactMuted = () => $('.heading-content .muted');

const PREG_CARD_SELECTOR = 'div[test-id="contact.profile.pregnancy.active"]';
const pregnancyCard = () => $(PREG_CARD_SELECTOR);
const weeksPregnant = () => $(`${PREG_CARD_SELECTOR} div[test-id="Weeks Pregnant"] p.card-field-value`);
const edd = () => $(`${PREG_CARD_SELECTOR} div[test-id="contact.profile.edd"] p.card-field-value`);
const highRisk = () => $(`${PREG_CARD_SELECTOR} div[test-id="contact.profile.risk.high"] label`);
const nextANCVisit = () => $(`${PREG_CARD_SELECTOR} div[test-id="contact.profile.anc.next"] p.card-field-value`);

const DEATH_CARD_SELECTOR = 'div[test-id="contact.profile.death.title"]';
const deathCard = () => $(DEATH_CARD_SELECTOR);
const deathDate = () => $(`${DEATH_CARD_SELECTOR} div[test-id="contact.profile.death.date"] p.card-field-value`);
const deathPlace = () => $(`${DEATH_CARD_SELECTOR} div[test-id="contact.profile.death.place"] p.card-field-value`);

const search = async (query) => {
  await (await searchBox()).setValue(query);
  await browser.keys(ENTER);
  await commonPage.waitForLoaderToDisappear(await $('.left-pane'));
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
  return Promise.all((await reportFilters()).map(filter => filter.getText()));
};

const getReportTaskFiltersText = async () => {
  await (await taskFilter()).waitForDisplayed();
  return await Promise.all((await taskFilters()).map(filter => filter.getText()));
};

const waitForContactLoaded = async (type) => {
  type && await (await contactCardIcon(type)).waitForDisplayed();
  await (await contactCard()).waitForDisplayed();
  await (await contactSummaryContainer()).waitForDisplayed();
};

const waitForContactUnloaded = async () => {
  await (await emptySelection()).waitForDisplayed();
};

const submitForm = async (waitForLoad = true) => {
  await (await genericForm.submitButton()).waitForDisplayed();
  await (await genericForm.submitButton()).click();
  waitForLoad && await waitForContactLoaded();
};

const addPlace = async ({
  type: typeValue = 'district_hospital',
  placeName: placeNameValue = 'District Test',
  contactName: contactNameValue = 'Person1',
  dob: dobValue = '2000-01-01',
  phone: phoneValue = '',
  sex: sexValue = 'female',
  role: roleValue = 'chw',
  externalID: externalIDValue = '12345678',
  notes: notesValue = 'Some test notes',
} = {},
rightSideAction = true,) => {
  if (rightSideAction) {
    await commonPage.clickFastActionFAB({ actionId: typeValue });
  } else {
    await commonPage.clickFastActionFlat({ waitForList: false });
  }
  await (await newPrimaryContactButton()).waitForDisplayed();
  await (await newPrimaryContactButton()).click();
  await (await newPrimaryContactName()).addValue(contactNameValue);
  await (await phoneField()).addValue(phoneValue);
  await (await dateOfBirthField()).addValue(dobValue);
  await (await sexField('contact', sexValue)).click();
  await (await roleField('contact', roleValue)).click();
  await genericForm.nextPage();
  await (await writeNamePlace(typeValue)).click();
  await (await newPlaceName()).addValue(placeNameValue);
  await (await externalIdField(typeValue)).addValue(externalIDValue);
  await (await notes(typeValue)).addValue(notesValue);
  await (await genericForm.submitButton()).waitForClickable();
  await (await genericForm.submitButton()).click();
  const dashedType = typeValue.replace('_', '-');
  await waitForContactLoaded(dashedType);
};

const addPerson = async ({
  name: nameValue = 'Person1',
  dob: dobValue = '2000-01-01',
  phone: phoneValue = '',
  sex: sexValue = 'female',
  role: roleValue = 'chw',
  externalID: externalIDValue = '12345678',
  notes: notesValue = 'Some test notes',
} = {}, waitForSentinel = true) => {
  const type = 'person';
  await commonPage.clickFastActionFAB({ actionId: type });
  await (await personName()).addValue(nameValue);
  await (await dateOfBirthField()).addValue(dobValue);
  await (await personName()).click(); // blur the datepicker field so the sex field is visible
  await (await phoneField()).addValue(phoneValue);
  await (await sexField(type, sexValue)).click();
  await (await roleField(type, roleValue)).click();
  await (await externalIdField(type)).addValue(externalIDValue);
  await (await notes(type)).addValue(notesValue);
  await submitForm();
  if (waitForSentinel) {
    await sentinelUtils.waitForSentinel();
  }
  await (await contactCardIcon(type)).waitForDisplayed();
  return (await contactCard()).getText();
};

const editPerson = async (currentName, { name, phone, dob }) => {
  await selectLHSRowByText(currentName);
  await waitForContactLoaded();
  await commonPage.openMoreOptionsMenu();
  await (await editContactButton()).waitForClickable();
  await (await editContactButton()).click();

  await (await genericForm.nextPage());

  if (name !== undefined) {
    await (await personName()).clearValue();
    await (await personName()).addValue(name);
  }
  if (phone !== undefined) {
    await (await phoneField()).clearValue();
    await (await phoneField()).addValue(phone);
  }
  if (dob !== undefined) {
    await (await dateOfBirthField()).clearValue();
    await (await dateOfBirthField()).addValue(dob);
  }

  await submitForm();
};

const editPersonName = async (name, updatedName) => {
  await editPerson(name, { name: updatedName });
  return (await contactCard()).getText();
};

const deletePerson = async () => {
  await commonPage.openMoreOptionsMenu();
  await (await deleteContactButton()).waitForClickable();
  await (await deleteContactButton()).click();
  await (await deleteConfirmationModalButton()).waitForClickable();
  await (await deleteConfirmationModalButton()).click();
};

const getContactSummaryField = async (fieldName) => {
  await (await contactSummaryContainer()).waitForDisplayed();
  const field = await (await contactSummaryContainer()).$(`.cell.${fieldName.toLowerCase().replace(/\./g, '\\.')}`);
  return await (await field.$('p')).getText();
};

const getPrimaryContactName = async () => {
  return (await name()).getText();
};

const getAllLHSContactsNames = async () => {
  await (await contentRow()).waitForDisplayed();
  return commonPage.getTextForElements(contactName);
};

const getAllRHSPeopleNames = async () => {
  await (await name()).waitForDisplayed();
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
  const parentCards = await contactCards();
  return Promise.all(parentCards.map(async (parent) => {
    return {
      heading: await (await parent.$('h3')).getText(),
      contactNames: await Promise.all((await parent.$$('.children h4 span')).map(filter => filter.getText()))
    };
  }));
};

const editDistrict = async (districtName, editedName) => {
  await selectLHSRowByText(districtName, true);
  await waitForContactLoaded();

  await commonPage.openMoreOptionsMenu();
  await (await editContactButton()).waitForClickable();
  await (await editContactButton()).click();

  await (await districtHospitalName()).setValue(editedName);
  // blur field to trigger Enketo validation
  await (await notes('district_hospital')).click();
  await submitForm();
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
  await contactInfoName().waitForDisplayed();
  return (await contactInfoName()).getText();
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

const getPregnancyLabel = async () => {
  await pregnancyLabel().waitForDisplayed();
  return (await pregnancyLabel()).getText();
};

const getVisitLabel = async () => {
  await visitLabel().waitForDisplayed();
  return (await visitLabel()).getText();
};

const getNumberOfReports = async () => {
  await numberOfReports().waitForDisplayed();
  return (await numberOfReports()).getText();
};

const getDeathCardInfo = async () => {
  await deathCard().waitForDisplayed();
  return {
    deathDate: await deathDate().getText(),
    deathPlace: await deathPlace().getText(),
  };
};

const getContactCardText = async () => {
  await contactCard().waitForDisplayed();
  return (await contactCard()).getText();
};

const exportContacts = async () => {
  await commonPage.openMoreOptionsMenu();
  await (await exportButton()).waitForClickable();
  await (await exportButton()).click();
};

const getCardFieldInfo = async (label) => {
  return {
    label: await (await $(`.cell.${label} label`)).getText(),
    value: await (await $(`.cell.${label} p`)).getText(),
  };
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
  topContact,
  getPrimaryContactName,
  getAllRHSPeopleNames,
  waitForContactLoaded,
  waitForContactUnloaded,
  contactCard,
  editPerson,
  editPersonName,
  exportContacts,
  getContactSummaryField,
  getAllRHSReportsNames,
  rhsReportListElement,
  getAllRHSTaskNames,
  rhsTaskListElement,
  deletePerson,
  allContactsList,
  editDistrict,
  childrenCards,
  submitForm,
  openReport,
  getContactCardTitle,
  getContactInfoName,
  getContactMedicID,
  getContactDeceasedStatus,
  newPrimaryContactButton,
  newPrimaryContactName,
  writeNamePlace,
  newPlaceName,
  externalIdField,
  notes,
  contactCardIcon,
  editContactButton,
  getContactCardText,
  pregnancyCard,
  getPregnancyCardInfo,
  deathCard,
  getDeathCardInfo,
  contactMuted,
  openFormWithWarning,
  getContactListLoadingStatus,
  getCardFieldInfo,
  getCurrentContactId,
  pregnancyLabel,
  visitLabel,
  numberOfReports,
  getPregnancyLabel,
  getVisitLabel,
  getNumberOfReports,
  getDisplayedContactsNames,
};
