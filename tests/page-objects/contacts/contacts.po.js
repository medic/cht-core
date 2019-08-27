const helper = require('../../helper');

const searchBox = element(by.css('#freetext'));
const seachButton = element(by.css('#search'));
const refreshButton = element(by.css('.fa fa-undo'));
const newDistrictButton = element(by.css('a[href="#/contacts//add/district_hospital?from=list"]'));
const newPlaceName = element(by.css('[name="/data/init/custom_place_name"]'));
const nextButton = element(by.css('button.btn.btn-primary.next-page.ng-scope'));
const newPersonTextBox = element(by.css('[name="/data/contact/name"]'));
const personNotes = element(by.css('[name="/data/contact/notes"]'));
const submitButton = element(by.css('.btn.submit.btn-primary.ng-scope'));
const newPersonButton = element(by.css('[name="/data/init/create_new_person"][value="new_person"]'));
const writeName = element(by.css('[name="/data/district_hospital/is_name_generated"][value="false"]'));

module.exports = {

  getSubmitButton: () => submitButton,

  addNewDistrict: districtName => {
    helper.waitUntilReady(newDistrictButton);
    newDistrictButton.click();
    helper.waitElementToBeVisible(newPersonButton);
    newPersonButton.click();
    newPersonTextBox.sendKeys('Bede');
    personNotes.sendKeys('Main CHW');
    nextButton.click();
    helper.waitElementToBeVisible(writeName);
    writeName.click();
    newPlaceName.sendKeys(districtName);
    submitButton.click();
  },

  addHealthCenter: () => {
    const newHealthCenterButton = element(by.css('[href$="/add/health_center"]'));
    helper.waitUntilReady(newHealthCenterButton);
    helper.clickElement(newHealthCenterButton);
    helper.waitElementToBeVisible(newPersonButton);
    newPersonButton.click();
    newPersonTextBox.sendKeys('Gareth');
    nextButton.click();
    const writeNameHC = element(by.css('[name="/data/health_center/is_name_generated"][value="false"]'));
    helper.waitElementToBeVisible(writeNameHC);
    writeNameHC.click();
    newPlaceName.sendKeys('Mavuvu Clinic');
    element(by.css('[name="/data/health_center/external_id"]')).sendKeys('1234457');
    element(by.css('[name="/data/health_center/notes"]')).sendKeys('some notes');
    submitButton.click();
  },

  refresh: () => {
    refreshButton.click();
  },

  search: query => {
    searchBox.sendKeys(query);
    seachButton.click();
  },
};

