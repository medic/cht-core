const genericForm = require('../forms/generic-form.wdio.page');
const searchBox = () => $('#freetext');
const searchButton = () => $('#search');
const contentRowSelector = '#contacts-list .content-row';
const contentRow = () => $(contentRowSelector);
const contentRows = () => $$(contentRowSelector);
const contactName = () => $$(`${contentRowSelector} .heading h4 span`);
const reportFilterSelector = '.card.reports .table-filter a';
const reportRowSelector = '#reports-list .content-row';
const reportRow = () => $(reportRowSelector);
const reportRowsText = () => $$(`${reportRowSelector} .heading h4 span`);
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
const rhsPeopleListSelector = () => $$('[test-id="person"] h4 span');
const contactSummaryContainer = () => $('#contact_summary');
const emptySelection = () => $('contacts-content .empty-selection');
const editContactButton = () => $('.action-container .right-pane .actions .mm-icon .fa-pencil');

const search = async (query) => {
  await (await searchBox()).setValue(query);
  await (await searchButton()).click();
};

const selectLHSRowByText = async (text, executeSearch= true) => {
  if (executeSearch) {
    await search(text);
  }
  await browser.waitUntil(async () => (await contentRows()).length);
  for (const row of await contentRows()) {
    if ((await row.getText()) === text) {
      return await row.click();
    }
  }
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

const addPlace = async (type, placeName , contactName ) => {
  const dashedType = type.replace('_','-');
  await (await actionResourceIcon(dashedType)).click();
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
  await (await editContactButton()).click();

  await (await genericForm.nextPage());

  await (await personName()).clearValue();
  await (await personName()).addValue(updatedName);

  await (await genericForm.submitButton()).click();
  await waitForContactLoaded();
  return (await contactCard()).getText();
};

const getContactSummaryField = async (fieldName) => {
  await (await contactSummaryContainer()).waitForDisplayed();
  const field = await (await contactSummaryContainer()).$(`.cell.${fieldName.replace(/\./g, '\\.')}`);
  return await (await field.$('p')).getText();
};

const getPrimaryContactName = async () => {
  return (await name()).getText();
};

const getAllLHSContactsNames = async () => {
  await (await contentRow()).waitForDisplayed();
  return getTextForElements(contactName);
};

const getTextForElements = async (elements) => {
  return Promise.all((await elements()).map(filter => filter.getText()));
};

const getAllReportsText = async () => {
  await (await reportRow()).waitForDisplayed();
  return getTextForElements(reportRowsText);
};

const getAllRHSPeopleNames = async () => {
  await (await name()).waitForDisplayed();
  return getTextForElements(rhsPeopleListSelector);
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
  topContact,
  getPrimaryContactName,
  getAllReportsText,
  getAllRHSPeopleNames,
  waitForContactLoaded,
  waitForContactUnloaded,
  contactCard,
  editPerson,
  getContactSummaryField,
};
