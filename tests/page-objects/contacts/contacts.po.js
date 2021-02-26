const helper = require('../../helper');
const genericForm = require('../forms/generic-form.po');
const searchBox = element(by.css('#freetext'));
const searchButton = element(by.css('#search'));
const refreshButton = element(by.css('.fa fa-undo'));
const newDistrictButton = element(by.css('a[href="#/contacts/add/district_hospital?from=list"]'));
const newPlaceName = element(by.css('[name="/data/init/custom_place_name"]'));
const newPersonTextBox = element(by.css('[name="/data/contact/name"]'));
const personNotes = element(by.css('[name="/data/contact/notes"]'));
const newPersonButton = element(by.css('[name="/data/init/create_new_person"][value="new_person"]'));
const writeName = element(by.css('[name="/data/district_hospital/is_name_generated"][value="false"]'));
const contactName = element(by.css('contacts-content .body.meta .heading-content'));
const rows = element.all(by.css('#contacts-list .content-row'));
const dateOfBirthField = element(by.css('[placeholder="yyyy-mm-dd"]'));
const contactSexField = element(by.css('[data-name="/data/contact/sex"][value="female"]'));
const peopleRows = element.all(by.css('.right-pane .card.children li'));
const deleteContact = element(by.css('.detail-actions:not(.ng-hide)')).element(by.className('fa fa-trash-o'));
const contactsTab = element(by.css('#contacts-tab'));

const leftActionBarButtons = () => element.all(by.css('.general-actions .actions.dropup > a'));

module.exports = {
  contactsList: () => element(by.css('#contacts-list')),
  contactContent: () => module.exports.contactsList().element(by.css('.content')),
  cardFieldLabelText: (label) => helper.getTextFromElementNative(element(by.css(`.cell.${label} label`))),
  cardFieldLabel:  (label) => element(by.css(`.cell.${label} label`)),
  cardFieldText: (label) => helper.getTextFromElementNative(element(by.css(`.cell.${label} p`))),
  searchBox,
  searchButton,
  contactsTab,
  peopleRows,
  contactName,
  center: () => element(by.css('.card h2')),
  name: () =>  element(by.css('.children h4 span')),
  selectLHSRowByText: async (text) => {
    await module.exports.search(text);
    await helper.waitUntilReadyNative(rows.last());
    await module.exports.clickRowByName(text);
    await helper.waitUntilReadyNative(contactName);
    expect(await contactName.getText()).toBe(text);
  },

  addNewDistrict: async (districtName) => {
    await module.exports.waitForActionbarButtons();
    await helper.waitUntilReadyNative(newDistrictButton);
    await newDistrictButton.click();
    await helper.waitUntilReadyNative(newPersonButton);
    await newPersonButton.click();
    await newPersonTextBox.sendKeys('Bede');
    await personNotes.sendKeys('Main CHW');
    await dateOfBirthField.sendKeys('2000-01-01');
    await helper.scrollElementIntoView(contactSexField);
    await contactSexField.click();
    await genericForm.nextPageNative();
    await helper.waitElementToBeVisibleNative(writeName);
    await writeName.click();
    await newPlaceName.sendKeys(districtName);
    return genericForm.submitButton.click();
  },

  addHealthCenter: async (name = 'Mavuvu Clinic') => {
    const newHealthCenterButton = element(by.css('[href$="/add/health_center"]'));
    await helper.waitUntilReadyNative(newHealthCenterButton);
    await helper.clickElementNative(newHealthCenterButton);
    await helper.waitUntilReadyNative(newPersonButton);
    await newPersonButton.click();
    await newPersonTextBox.sendKeys('Gareth');
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
    const newClinicButton = element(by.css('[href$="/add/clinic"]'));
    await helper.waitUntilReadyNative(newClinicButton);
    await helper.waitElementToDisappear(by.id('snackbar'));
    await helper.clickElementNative(newClinicButton);
    await helper.waitElementToBeVisibleNative(newPersonButton);
    await newPersonButton.click();
    await newPersonTextBox.sendKeys('Todd');
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

  refresh: async () => {
    await refreshButton.click();
  },

  search: async (query) => {
    await searchBox.clear();
    await searchBox.sendKeys(query);
    await searchButton.click();
  },

  clickRowByName: async (name) => {
    await rows.filter(elem => elem.getText().then(text => text === name)).first().click();
  },

  deleteContactByName: async (contactName) => {
    const peopleRow = await peopleRows
      .filter((row) => row.getText().then(text => text.includes(contactName)))
      .first();
    await helper.waitUntilReadyNative(peopleRow);
    // this element shows up underneath the actionbar, so the actionbar can intercept the click
    await browser.executeScript(`arguments[0].scrollIntoView({block: "center"});`, peopleRow);
    await peopleRow.click();
    await helper.waitUntilReadyNative(deleteContact);
    await deleteContact.click();
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
  }
};
