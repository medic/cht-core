const helper = require('../../helper');
const genericForm = require('../forms/generic-form.po');
const utils = require('../../utils');

const searchBox = element(by.css('input#freetext'));
const newDistrictButton = element(by.css('a[href="#/contacts/add/district_hospital?from=list"]'));
const newPlaceName = element(by.css('[name="/data/init/custom_place_name"]'));
const districtHospitalName = element(by.css('[name="/data/district_hospital/name"]'));
const newPrimaryContactName = element(by.css('[name="/data/contact/name"]'));
const personNotes = element(by.css('[name="/data/contact/notes"]'));
const newPrimaryContactButton = element(by.css('[name="/data/init/create_new_person"][value="new_person"]'));
const manualDistrictHospitalName = element(by.css('[name="/data/district_hospital/is_name_generated"][value="false"]'));
const contactName = element(by.css('contacts-content .body.meta .heading-content h2'));
const rows = element.all(by.css('#contacts-list .content-row'));
const dateOfBirthField = element(by.css('[placeholder="yyyy-mm-dd"]'));
const contactSexField = element(by.css('[data-name="/data/contact/sex"][value="female"]'));
const peopleRows = element.all(by.css('.right-pane .card.children li'));
const deleteContact = element(by.css('.detail-actions:not(.ng-hide)')).element(by.className('fa fa-trash-o'));
const editContact = element(by.css('.detail-actions:not(.ng-hide)')).element(by.className('fa fa-pencil'));
const newActions = element(by.css('.detail-actions:not(.ng-hide)')).element(by.className('dropdown-toggle'));
const contactsTab = element(by.css('#contacts-tab'));
const newHealthCenterButton = element(by.css('[href$="/add/health_center"]'));
const newClinicButton = element(by.css('[href$="/add/clinic"]'));
const newPersonButton = element(by.css('[href$="/add/person"]'));
const personName = element(by.css('[name="/data/person/name"]'));
const personSexField = element(by.css('[data-name="/data/person/sex"][value="female"]'));
const contactSummaryContainer = element(by.css('.body.meta .row.flex.grid'));

const leftActionBarButtons = () => element.all(by.css('.general-actions .actions.dropup > a'));

module.exports = {
  contactsList: () => element(by.css('#contacts-list')),
  contactContent: () => module.exports.contactsList().element(by.css('.content')),
  cardFieldLabelText: (label) => helper.getTextFromElementNative(element(by.css(`.cell.${label} label`))),
  cardFieldLabel:  (label) => element(by.css(`.cell.${label} label`)),
  cardFieldText: (label) => helper.getTextFromElementNative(element(by.css(`.cell.${label} p`))),
  searchBox,
  contactsTab,
  peopleRows,
  contactName,
  editContact,
  newActions,
  formById: (id) => element(by.id(`form:${id}`)),
  contactLoaded: () => helper.waitUntilReadyNative(contactSummaryContainer),
  center: () => element(by.css('.card h2')),
  childrenCards: () => element.all(by.css('.right-pane .card.children')),
  name: () =>  element(by.css('.children h4 span')),
  selectLHSRowByText: async (text) => {
    await module.exports.search(text);
    await helper.waitUntilReadyNative(rows.last());
    await module.exports.clickRowByName(text);
    await helper.waitUntilReadyNative(contactName);
    // wait until contact summary is loaded
    await module.exports.contactLoaded();
    expect(await contactName.getText()).toBe(text);
  },

  loadContact: async (uuid) => {
    await browser.get(utils.getBaseUrl() + 'contacts/' + uuid);
    await module.exports.contactLoaded();
  },

  addNewDistrict: async (districtName) => {
    await module.exports.waitForActionbarButtons();
    await helper.waitUntilReadyNative(newDistrictButton);
    await newDistrictButton.click();
    await helper.waitUntilReadyNative(newPrimaryContactButton);
    await newPrimaryContactButton.click();
    await newPrimaryContactName.sendKeys('Bede');
    await personNotes.sendKeys('Main CHW');
    await dateOfBirthField.sendKeys('2000-01-01');
    await helper.scrollElementIntoView(contactSexField);
    await contactSexField.click();
    await genericForm.nextPageNative();
    await helper.waitElementToBeVisibleNative(manualDistrictHospitalName);
    await manualDistrictHospitalName.click();
    await newPlaceName.sendKeys(districtName);
    return genericForm.submitButton.click();
  },

  editDistrict: async (districtName, editedName) => {
    await module.exports.selectLHSRowByText(districtName);
    await helper.clickElementNative(editContact);
    await helper.waitUntilReadyNative(districtHospitalName);
    await districtHospitalName.clear();
    await districtHospitalName.sendKeys(editedName);
    // trigger blur to trigger Enketo validation
    await element(by.css('[name="/data/district_hospital/notes"]')).click();
    await genericForm.submitButton.click();
  },

  addHealthCenter: async (name = 'Mavuvu Clinic') => {
    await helper.waitUntilReadyNative(newHealthCenterButton);
    await helper.clickElementNative(newHealthCenterButton);
    await helper.waitUntilReadyNative(newPrimaryContactButton);
    await newPrimaryContactButton.click();
    await newPrimaryContactName.sendKeys('Gareth');
    await dateOfBirthField.sendKeys('2000-01-01');
    await helper.scrollElementIntoView(contactSexField);
    await contactSexField.click();
    await genericForm.nextPageNative();
    const writeNameHC = element(by.css('[name="/data/health_center/is_name_generated"][value="false"]'));
    await helper.waitElementToBeVisibleNative(writeNameHC);
    await writeNameHC.click();
    await newPlaceName.sendKeys(name);
    await element(by.css('[name="/data/health_center/external_id"]')).sendKeys('1234457');
    await element(by.css('[name="/data/health_center/notes"]')).sendKeys('some notes');
    return genericForm.submitButton.click();
  },

  addClinic: async (name = 'Clinic 1') => {
    await helper.waitUntilReadyNative(newClinicButton);
    await helper.waitElementToDisappear(by.id('snackbar'));
    await helper.clickElementNative(newClinicButton);
    await helper.waitElementToBeVisibleNative(newPrimaryContactButton);
    await newPrimaryContactButton.click();
    await newPrimaryContactName.sendKeys('Todd');
    await dateOfBirthField.sendKeys('2000-01-01');
    await helper.scrollElementIntoView(contactSexField);
    await contactSexField.click();
    await genericForm.nextPageNative();
    const writeNameHC = element(by.css('[name="/data/clinic/is_name_generated"][value="false"]'));
    await helper.waitElementToBeVisibleNative(writeNameHC);
    await writeNameHC.click();
    await newPlaceName.sendKeys(name);
    await element(by.css('[name="/data/clinic/external_id"]')).sendKeys('1234457');
    await element(by.css('[name="/data/clinic/notes"]')).sendKeys('some notes');
    await genericForm.submitButton.click();
  },

  addPerson: async (name, dob = '2000-01-01') => {
    await helper.clickElementNative(newPersonButton);
    await helper.waitElementToBeVisibleNative(personName);
    await personName.sendKeys(name);
    await dateOfBirthField.sendKeys(dob);
    await personName.click(); // blur the datepicker field so the sex field is visible
    await helper.scrollElementIntoView(personSexField);
    await personSexField.click();
    await element(by.css('[name="/data/person/notes"]')).sendKeys('some notes');
    await genericForm.submitButton.click();
  },

  editPerson: async (name, editedName) => {
    await module.exports.selectLHSRowByText(name);
    await helper.clickElementNative(editContact);
    await genericForm.nextPageNative();
    await helper.waitUntilReadyNative(personName);
    await personName.clear();
    await personName.sendKeys(editedName);
    await dateOfBirthField.sendKeys('2000-01-01');
    await personName.click(); // blur the datepicker field so the sex field is visible
    await helper.scrollElementIntoView(personSexField);
    await genericForm.submitButton.click();
  },

  search: async (query) => {
    await searchBox.clear();
    await searchBox.sendKeys(query);
    await searchBox.sendKeys(protractor.Key.ENTER);
  },

  clickRowByName: async (name) => {
    await rows.filter(elem => elem.getText().then(text => text === name)).first().click();
  },

  selectContactByName: async (contactName) => {
    const peopleRow = await peopleRows
      .filter((row) => row.getText().then(text => text.includes(contactName)))
      .first();
    await helper.waitUntilReadyNative(peopleRow);
    // this element shows up underneath the actionbar, so the actionbar can intercept the click
    await browser.executeScript(`arguments[0].scrollIntoView({block: "center"});`, peopleRow);
    await helper.clickElementNative(peopleRow);
  },

  deleteContactByName: async (contactName) => {
    await module.exports.selectContactByName(contactName);
    await helper.clickElementNative(deleteContact);
  },

  getReportsFilters: () => element.all(by.css('.card.reports .table-filter a')),
  getTasksFilters: () => element.all(by.css('.card.tasks .table-filter a')),

  waitForActionbarButtons: (nonAdminUser) => {
    if (nonAdminUser) {
      // non admin users might not see any links here, depending on config
      return;
    }
    // wait for all actionbar links to appear
    return browser.wait(async () => await leftActionBarButtons().count() === 2, 1000);
  },
  cardElementByHeaderText: (headerText) => {
    const cssClass = '.card .action-header';
    return element(by.cssContainingText(cssClass, headerText));
  },
  cardChildrenValueArray: (cardElement) => {
    return cardElement.element(by.xpath('..')).all(by.css('.cell p')).getText();
  },
  taskNames: async () => {
    const tasks = element(by.css('.card.tasks'));
    await helper.waitUntilReadyNative(tasks);
    const taskContent = tasks.all(by.css('.content'));
    return taskContent.getText();
  }
};
