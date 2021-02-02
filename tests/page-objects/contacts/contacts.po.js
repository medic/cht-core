const helper = require('../../helper');
const searchBox = element(by.css('#freetext'));
const searchButton = element(by.css('#search'));
const refreshButton = element(by.css('.fa fa-undo'));
const newDistrictButton = element(by.css('a[href="#/contacts//add/district_hospital?from=list"]'));
const newPlaceName = element(by.css('[name="/data/init/custom_place_name"]'));
const nextButton = element(by.css('button.btn.btn-primary.next-page.ng-scope'));
const newPersonTextBox = element(by.css('[name="/data/contact/name"]'));
const personNotes = element(by.css('[name="/data/contact/notes"]'));
const submitButton = element(by.css('.btn.submit.btn-primary.ng-scope'));
const newPersonButton = element(by.css('[name="/data/init/create_new_person"][value="new_person"]'));
const writeName = element(by.css('[name="/data/district_hospital/is_name_generated"][value="false"]'));
const contactName = element(by.css('.heading-content'));
const rows = element.all(by.className('content-row'));
const dateOfBirthField = element(by.css('[placeholder="yyyy-mm-dd"]'));
const contactSexField = element(by.css('[data-name="/data/contact/sex"][value="female"]'));
const peopleRows = element.all(by.repeater('group in contactsContentCtrl.selectedContact.children'));
const deleteContact = element(by.css('.detail-actions:not(.ng-hide)')).element(by.className('fa fa-trash-o'));
const contactsTab = element(by.css('#contacts-tab'));


module.exports = {
  contactsList: () => element(by.css('#contacts-list')),
  contactContent: () => module.exports.contactsList().element(by.css('.content')),
  cardFieldLabelText: (label) => helper.getTextFromElement(element(by.css(`.cell.${label} label`))),
  cardFieldLabel:  (label) => element(by.css(`.cell.${label} label`)),
  cardFieldText: (label) => helper.getTextFromElement(element(by.css(`.cell.${label} p`))),
  searchBox,
  searchButton,
  contactsTab,
  peopleRows,
  contactName,
  center: () => element(by.css('.card h2')),
  name: () =>  element(by.css('.children h4 span')),
  selectLHSRowByText: async text => {
    module.exports.search(text);
    helper.waitUntilReady(rows.last());
    module.exports.clickRowByName(text);
    helper.waitUntilReady(contactName);
    expect(await contactName.getText()).toBe(text);
  },

  addNewDistrict: async districtName => {
    helper.waitUntilReady(newDistrictButton);
    await newDistrictButton.click();
    helper.waitElementToBeVisible(newPersonButton);
    newPersonButton.click();
    newPersonTextBox.sendKeys('Bede');
    personNotes.sendKeys('Main CHW');
    dateOfBirthField.sendKeys('2000-01-01');
    helper.scrollElementIntoView(contactSexField);
    contactSexField.click();
    nextButton.click();
    helper.waitElementToBeVisible(writeName);
    writeName.click();
    newPlaceName.sendKeys(districtName);
    await submitButton.click();
  },

  addHealthCenter: (name = 'Mavuvu Clinic') => {
    const newHealthCenterButton = element(by.css('[href$="/add/health_center"]'));
    helper.waitUntilReady(newHealthCenterButton);
    helper.clickElement(newHealthCenterButton);
    helper.waitElementToBeVisible(newPersonButton);
    newPersonButton.click();
    newPersonTextBox.sendKeys('Gareth');
    dateOfBirthField.sendKeys('2000-01-01');
    helper.scrollElementIntoView(contactSexField);
    contactSexField.click();
    nextButton.click();
    const writeNameHC = element(by.css('[name="/data/health_center/is_name_generated"][value="false"]'));
    helper.waitElementToBeVisible(writeNameHC);
    writeNameHC.click();
    newPlaceName.sendKeys(name);
    element(by.css('[name="/data/health_center/external_id"]')).sendKeys('1234457');
    element(by.css('[name="/data/health_center/notes"]')).sendKeys('some notes');
    submitButton.click();
  },

  addClinic: (name = 'Clinic 1') => {
    const newClinicButton = element(by.css('[href$="/add/clinic"]'));
    helper.waitUntilReady(newClinicButton);
    helper.waitElementToDisappear(by.id('snackbar'));
    helper.clickElement(newClinicButton);
    helper.waitElementToBeVisible(newPersonButton);
    newPersonButton.click();
    newPersonTextBox.sendKeys('Todd');
    dateOfBirthField.sendKeys('2000-01-01');
    helper.scrollElementIntoView(contactSexField);
    contactSexField.click();
    nextButton.click();
    const writeNameHC = element(by.css('[name="/data/clinic/is_name_generated"][value="false"]'));
    helper.waitElementToBeVisible(writeNameHC);
    writeNameHC.click();
    newPlaceName.sendKeys(name);
    element(by.css('[name="/data/clinic/external_id"]')).sendKeys('1234457');
    element(by.css('[name="/data/clinic/notes"]')).sendKeys('some notes');
    submitButton.click();
  },

  refresh: () => {
    refreshButton.click();
  },

  search: async query => {
    await searchBox.clear();
    await searchBox.sendKeys(query);
    await searchButton.click();
  },

  clickRowByName: async name => {
    await rows.filter(elem => elem.getText().then(text => text === name)).first().click();
  },

  deleteContactByName: async contactName => {
    const peopleRow = peopleRows.filter((row) => {
      return row.getText().then((text) => {
        return text.includes(contactName);
      });
    });
    helper.waitUntilReady(peopleRow);
    peopleRow.click();
    helper.waitUntilReady(deleteContact);
    deleteContact.click();
  }
};
