const genericForm = require('../forms/generic-form.wdio.page');
const commonElements = require('../common/common.wdio.page');

const searchBox = () => $('#freetext');
const searchButton = () => $('#search');
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
const contactSexField = () => $('[data-name="/data/contact/sex"][value="female"]');
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
const formTitle = () => $('#form-title');

const rhsPeopleListSelector = () => $$('.card.children.persons h4 span');
const rhsReportListSelector = '.card.reports mm-content-row h4 span';
const rhsTaskListSelector = '.card.tasks mm-content-row h4 span';
const rhsTaskListElement = () => $(rhsTaskListSelector);
const rhsTaskListElementList = () => $$(rhsTaskListSelector);
const rhsReportListElement = () => $(rhsReportListSelector);
const rhsReportElementList = () => $$(rhsReportListSelector);

const contactSummaryContainer = () => $('#contact_summary');
const emptySelection = () => $('contacts-content .empty-selection');
const editContactButton = () => $('.action-container .right-pane .actions .mm-icon .fa-pencil');
const deleteContactButton = () => $('.action-container .right-pane .actions .mm-icon .fa-trash-o');
const deleteConfirmationModalButton = () => $('.modal-footer a.btn-danger');
const leftAddPlace = () => $('.dropup a[mmauth="can_create_places"]');
const rightAddPlace = () => $('span[test-id="rhs_add_contact"] a');
const rightAddPlaces = () => $('span[test-id="rhs_add_contact"] p[test-key="Add place"]');
const rightAddPersons = () => $('span[test-id="rhs_add_contact"] p[test-key="Add person"]');
const rightAddPerson = (create_key) => $(`span[test-id="rhs_add_contact"] p[test-key="${create_key}"]`);
const rightNewAction = () => $('.right-pane .actions.dropup a[data-toggle="dropdown"]');
const rightNewActionItem = (formName) => $(`.right-pane .actions.dropup li[id="form:${formName}"]`);
const contactCards = () => $$('.card.children');
const districtHospitalName = () => $('[name="/data/district_hospital/name"]');
const childrenCards = () => $$('.right-pane .card.children');

const search = async (query) => {
  await (await searchBox()).setValue(query);
  await (await searchButton()).click();
  await commonElements.waitForLoaderToDisappear(await $('.left-pane'));
  await (await emptySelection()).waitForDisplayed();
};

const findRowByText = async (text) => {
  for (const row of await contentRows()) {
    if ((await row.getText()) === text) {
      return row;
    }
  }
};

const selectLHSRowByText = async (text, executeSearch= true) => {
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

const getReportFiltersText = async () => {
  await (await reportFilter()).waitForDisplayed();
  return Promise.all((await reportFilters()).map(filter => filter.getText()));
};

const getReportTaskFiltersText = async () => {
  await (await taskFilter()).waitForDisplayed();
  return await Promise.all((await taskFilters()).map(filter => filter.getText()));
};

const waitForContactLoaded = async () => {
  await (await contactCard()).waitForDisplayed();
  await (await contactSummaryContainer()).waitForDisplayed();
};

const waitForContactUnloaded = async () => {
  await (await emptySelection()).waitForDisplayed();
};

const addPlace = async (type, placeName, contactName ) => {
  const dashedType = type.replace('_', '-');
  await (await actionResourceIcon(dashedType)).waitForDisplayed();
  await (await actionResourceIcon(dashedType)).click();

  await (await newPrimaryContactButton()).waitForDisplayed();
  await (await newPrimaryContactButton()).click();
  await (await newPrimaryContactName()).addValue(contactName);
  await (await dateOfBirthField()).addValue('2000-01-01');
  await (await contactSexField()).click();
  await genericForm.nextPage();
  await (await writeNamePlace(type)).click();
  await (await newPlaceName()).addValue(placeName);
  await (await externalIdField(type)).addValue('1234457');
  await (await notes(type)).addValue(`Some ${type} notes`);
  await (await genericForm.submitButton()).click();
  await (await contactCardIcon(dashedType)).waitForDisplayed();
  await (await contactCard()).waitForDisplayed();
};

const addPerson = async (name, params = {}) => {
  const { dob='2000-01-01', phone } = params;
  await (await actionResourceIcon('person')).click();
  await (await personName()).addValue(name);
  await (await dateOfBirthField()).addValue(dob);
  await (await personName()).click(); // blur the datepicker field so the sex field is visible
  if (phone) {
    await (await personPhoneField()).addValue(phone);
  }
  await (await personSexField()).click();
  await (await notes('person')).addValue('some person notes');
  await (await genericForm.submitButton()).click();
  await (await contactCardIcon('person')).waitForDisplayed();
  return (await contactCard()).getText();
};

const editPerson = async (name, updatedName) => {
  await selectLHSRowByText(name);
  await waitForContactLoaded();
  await (await editContactButton()).waitForDisplayed();
  await (await editContactButton()).click();

  await (await genericForm.nextPage());

  await (await personName()).clearValue();
  await (await personName()).addValue(updatedName);

  await (await genericForm.submitButton()).click();
  await waitForContactLoaded();
  return (await contactCard()).getText();
};

const deletePerson = async (name) => {
  await selectLHSRowByText(name);
  await waitForContactLoaded();
  await (await deleteContactButton()).click();
  await (await deleteConfirmationModalButton()).waitForDisplayed();
  await (await deleteConfirmationModalButton()).click();
};

const openNewAction = async (formName) => {
  await (await rightNewAction()).click();
  await (await rightNewActionItem(formName)).click();
  await (await formTitle()).waitForDisplayed();
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
      heading: await(await parent.$('h3')).getText(),
      contactNames: await Promise.all((await parent.$$('.children h4 span')).map(filter => filter.getText()))
    };
  }));
};

const editDistrict = async (districtName, editedName) => {
  await selectLHSRowByText(districtName, true);
  await waitForContactLoaded();

  await (await editContactButton()).waitForDisplayed();
  await (await editContactButton()).click();

  await (await districtHospitalName()).setValue(editedName);
  // blur field to trigger Enketo validation
  await (await notes('district_hospital')).click();
  await (await genericForm.submitButton()).click();
};

module.exports = {
  selectLHSRowByText,
  reportFilters,
  getReportFiltersText,
  getReportTaskFiltersText,
  contactList,
  getAllLHSContactsNames,
  addPerson,
  addPlace,
  openNewAction,
  topContact,
  getPrimaryContactName,
  getAllRHSPeopleNames,
  waitForContactLoaded,
  waitForContactUnloaded,
  contactCard,
  editPerson,
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
  childrenCards
};
