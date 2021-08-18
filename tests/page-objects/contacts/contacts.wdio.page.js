const genericForm = require('../forms/generic-form.wdio.page');
const searchBox = () => $('#freetext');
const searchButton = () => $('#search');
const contentRowSelector = '#contacts-list .content-row';
const contentRow = () => $(contentRowSelector);
const contentRowsText = () => $$(`${contentRowSelector} .heading h4 span`);
const rowByText = async (text) => (await contentRow()).$(`span=${text}`);
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
const topContact = () => $('#contacts-list > ul > li:nth-child(1) > a > div.content > div > h4 > span');
const name = () => $('.children h4 span');
const externalIdField = (place) => $(`[name="/data/${place}/external_id"]`);
const notes = (place) => $(`[name="/data/${place}/notes"]`);
const writeNamePlace = (place) => $(`[name="/data/${place}/is_name_generated"][value="false"]`);
const contactCard = () => $('.card h2');
const contactCardIcon = (name) => $(`.card .heading .resource-icon[title="medic-${name}"]`);
const rhsPeopleListSelector = () => $$('[test-id="person"] h4 span');

const search = async (query) => {
  await (await searchBox()).setValue(query);
  await (await searchButton()).click();
};

const selectLHSRowByText = async (text) => {
  await search(text);
  await (await rowByText(text)).click();
};

const getReportFiltersText = async () => {
  await (await reportFilter()).waitForDisplayed();
  return Promise.all((await reportFilters()).map(filter => filter.getText()));
};

const getReportTaskFiltersText = async () => {
  await (await taskFilter()).waitForDisplayed();
  return await Promise.all((await taskFilters()).map(filter => filter.getText()));
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

const addPerson = async (name, dob = '2000-01-01') => {
  await (await actionResourceIcon('person')).click();
  await (await personName()).addValue(name);
  await (await dateOfBirthField()).addValue(dob);
  await (await personName()).click(); // blur the datepicker field so the sex field is visible
  await (await personSexField()).click();
  await (await notes('person')).addValue('some person notes');
  await (await genericForm.submitButton()).click();
  await (await contactCardIcon('person')).waitForDisplayed();
  return (await contactCard()).getText();
};

const getPrimaryContactName = async () => {
  return (await name()).getText();
};

const getAllContactText = async () => {
  await (await contentRow()).waitForDisplayed();
  return getTextForElements(contentRowsText);
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
  getAllContactText,
  addPerson,
  addPlace,
  topContact,
  getPrimaryContactName,
  getAllReportsText,
  getAllRHSPeopleNames,
};
