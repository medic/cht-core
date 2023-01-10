const genericForm = require('../enketo/generic-form.wdio.page');
const commonElements = require('../common/common.wdio.page');
const sentinelUtils = require('../../../utils/sentinel');
const utils = require('../../../utils');
const modalPage = require('../../../page-objects/default/common/modal.wdio.page');
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
const newPlaceName = () => $('[name="/data/init/custom_place_name"]');
const newPrimaryContactName = () => $('[name="/data/contact/name"]');
const newPrimaryContactButton = () => $('[name="/data/init/create_new_person"][value="new_person"]');
const actionResourceIcon = (name) => $(`.actions.dropup .mm-icon .resource-icon[title="medic-${name}"]`);
const dateOfBirthField = () => $('[placeholder="yyyy-mm-dd"]');
const contactSexField = (value) => $(`[data-name="/data/contact/sex"][value="${value}"]`);
const contactRoleField = (role) => $(`span[data-itext-id="/data/contact/role/${role}:label"].active`);
const contactPhoneField = () => $('span[data-itext-id="/data/contact/phone:label"] + input[type="tel"]');
const personName = () => $('[name="/data/person/name"]');
const personSexField = () => $('[data-name="/data/person/sex"][value="female"]');
const personPhoneField = () => $('input.ignore[type="tel"]');
const topContact = () => $('#contacts-list > ul > li:nth-child(1) > a > div.content > div > h4 > span');
const name = () => $('.children h4 span');
const externalIdField = (place) => $(`[name="/data/${place}/external_id"]`);
const notes = (place) => $(`[name="/data/${place}/notes"]`);
const writeNamePlace = (place) => $(`[name="/data/${place}/is_name_generated"][value="false"]`);
const contactCard = () => $('.card h2');
const contactCardIcon = (name) => $(`.card .heading .resource-icon[title="medic-${name}"]`);

const rhsPeopleListSelector = () => $$('.card.children.persons h4 span');
const rhsReportListSelector = '.card.reports mm-content-row h4 span';
const rhsTaskListSelector = '.card.tasks mm-content-row h4 span';
const rhsTaskListElement = () => $(rhsTaskListSelector);
const rhsTaskListElementList = () => $$(rhsTaskListSelector);
const rhsReportListElement = () => $(rhsReportListSelector);
const rhsReportElementList = () => $$(rhsReportListSelector);

const contactSummaryContainer = () => $('#contact_summary');
const emptySelection = () => $('contacts-content .empty-selection');
const exportButton = () => $('.mat-menu-content .mat-menu-item[test-id="export-contacts"]');
const editContactButton = () => $('.mat-menu-content .mat-menu-item[test-id="edit-contacts"]');
const deleteContactButton = () => $('.mat-menu-content .mat-menu-item[test-id="delete-contacts"]');
const deleteConfirmationModalButton = () => $('.modal-footer a.btn-danger');
const leftAddPlace = () => $('.dropup a.create-place');
const rightAddPlace = () => $('span[test-id="rhs_add_contact"] a');
const rightAddPlaces = () => $('span[test-id="rhs_add_contact"] p[test-key="Add place"]');
const rightAddPersons = () => $('span[test-id="rhs_add_contact"] p[test-key="Add person"]');
const rightAddPerson = (create_key) => $(`span[test-id="rhs_add_contact"] p[test-key="${create_key}"]`);
const contactCards = () => $$('.card.children');
const districtHospitalName = () => $('[name="/data/district_hospital/name"]');
const childrenCards = () => $$('.right-pane .card.children');
const newActionContactButton = () => $('.action-container .right-pane .actions .mm-icon .fa-stack');
const forms = () => $$('.action-container .detail-actions .actions.dropup .open .dropdown-menu li');
const formTitle = () => $('#form-title');
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
  await browser.keys('Enter');
  await commonElements.waitForLoaderToDisappear(await $('.left-pane'));
};

const findRowByText = async (text) => {
  for (const row of await contentRows()) {
    if ((await row.getText()) === text) {
      return row;
    }
  }
};

const selectLHSRowByText = async (text, executeSearch = true) => {
  await commonElements.waitForLoaderToDisappear();
  if (executeSearch) {
    await search(text);
  }
  await browser.waitUntil(async () => await findRowByText(text));
  const row = await findRowByText(text);
  if (!row) {
    throw new Error(`Contact "${text}" was not found`);
  }
  return await row.click();
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

const submitForm = async () => {
  await (await genericForm.submitButton()).waitForDisplayed();
  await (await genericForm.submitButton()).click();
  await waitForContactLoaded();
};

const addPlace = async ({
  type: typeValue = 'district_hospital',
  placeName: placeNameValue = 'District Test',
  contactName: contactNameValue = 'Person1',
  dob: dobValue = '2000-01-01',
  phone: phoneValue = '+50689999999',
  sex: sexValue = 'female',
  role: roleValue = 'chw',
  externalID: externalIDValue = '12345678',
  notes: notesValue = 'Some test notes',
} = {}) => {
  const dashedType = typeValue.replace('_', '-');
  await (await actionResourceIcon(dashedType)).waitForDisplayed();
  await (await actionResourceIcon(dashedType)).click();
  await (await newPrimaryContactButton()).waitForDisplayed();
  await (await newPrimaryContactButton()).click();
  await (await newPrimaryContactName()).addValue(contactNameValue);
  await (await contactPhoneField()).addValue(phoneValue);  
  await (await dateOfBirthField()).addValue(dobValue);  
  await (await contactSexField(sexValue)).click();
  await (await contactRoleField(roleValue)).click();
  await genericForm.nextPage();
  await (await writeNamePlace(typeValue)).click();
  await (await newPlaceName()).addValue(placeNameValue);
  await (await externalIdField(typeValue)).addValue(externalIDValue);
  await (await notes(typeValue)).addValue(notesValue);
  await (await genericForm.submitButton()).click();
  await waitForContactLoaded(dashedType);
};

const addPerson = async (name, params = {}) => {
  const type = 'person';
  const { dob = '2000-01-01', phone } = params;
  await (await actionResourceIcon(type)).waitForDisplayed();
  await (await actionResourceIcon(type)).click();
  await (await personName()).addValue(name);
  await (await dateOfBirthField()).addValue(dob);
  await (await personName()).click(); // blur the datepicker field so the sex field is visible
  if (phone) {
    await (await personPhoneField()).addValue(phone);
  }
  await (await personSexField()).click();
  await (await notes(type)).addValue('some person notes');
  await submitForm();
  await sentinelUtils.waitForSentinel();
  await (await contactCardIcon('person')).waitForDisplayed();
  return (await contactCard()).getText();
};

const editPerson = async (name, updatedName) => {
  await selectLHSRowByText(name);
  await waitForContactLoaded();
  await commonElements.openMoreOptionsMenu();
  await (await editContactButton()).waitForClickable();
  await (await editContactButton()).click();

  await (await genericForm.nextPage());

  await (await personName()).clearValue();
  await (await personName()).addValue(updatedName);

  await submitForm();
  return (await contactCard()).getText();
};

const deletePerson = async () => {
  await commonElements.openMoreOptionsMenu();
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
  return commonElements.getTextForElements(contactName);
};

const getAllRHSPeopleNames = async () => {
  await (await name()).waitForDisplayed();
  return commonElements.getTextForElements(rhsPeopleListSelector);
};

const getAllRHSReportsNames = async () => {
  await (await rhsReportListElement()).waitForDisplayed();
  return commonElements.getTextForElements(rhsReportElementList);
};

const getAllRHSTaskNames = async () => {
  await (await rhsTaskListElement()).waitForDisplayed();
  return commonElements.getTextForElements(rhsTaskListElementList);
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

  await commonElements.openMoreOptionsMenu();
  await (await editContactButton()).waitForClickable();
  await (await editContactButton()).click();

  await (await districtHospitalName()).setValue(editedName);
  // blur field to trigger Enketo validation
  await (await notes('district_hospital')).click();
  await submitForm();
};

const createNewAction = async (formName) => {
  await (await newActionContactButton()).waitForDisplayed();
  await (await newActionContactButton()).waitForClickable();
  await (await newActionContactButton()).click();
  await openForm(formName);
};

const openForm = async (name) => {
  const parent = await newActionContactButton().parentElement();
  await browser.waitUntil(async () => await parent.getAttribute('aria-expanded') === 'true');

  for (const form of await forms()) {
    if (await form.getText() === name) {
      await form.click();
      await (await formTitle()).waitForDisplayed();
      return;
    }
  }
  throw new Error(`Form with name: "${name}" not found`);
};

const openFormWithWarning = async (formName) => {
  await (await newActionContactButton()).waitForClickable();
  await (await newActionContactButton()).click();
  const parent = await newActionContactButton().parentElement();
  await browser.waitUntil(async () => await parent.getAttribute('aria-expanded') === 'true');

  for (const form of await forms()) {
    if (await form.getText() === formName) {
      await form.click();
      await (await modalPage.body()).waitForExist();
      return modalPage.getModalDetails();
    }
  }
  throw new Error(`Form with name: "${formName}" not found`);
};

const openReport = async () => {
  await commonElements.toggleActionbar(true);
  await (await rhsReportListElement()).waitForDisplayed();
  await (await rhsReportListElement()).click();
  await commonElements.toggleActionbar();
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
  await commonElements.openMoreOptionsMenu();
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
  exportContacts,
  getContactSummaryField,
  getAllRHSReportsNames,
  rhsReportListElement,
  getAllRHSTaskNames,
  rhsTaskListElement,
  deletePerson,
  leftAddPlace,
  rightAddPlace,
  rightAddPlaces,
  rightAddPersons,
  rightAddPerson,
  allContactsList,
  editDistrict,
  childrenCards,
  createNewAction,
  submitForm,
  openReport,
  getContactCardTitle,
  getContactInfoName,
  getContactMedicID,
  getContactDeceasedStatus,
  actionResourceIcon,
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
  getCurrentContactId,
};
