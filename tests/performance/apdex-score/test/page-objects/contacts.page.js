const Page = require('./page');

class ContactsPage extends Page {

  async loadContactList(settingsProvider) {
    const page = settingsProvider.getPage('contactList');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

  async loadCHWArea(settingsProvider) {
    const page = settingsProvider.getPage('chwArea');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

  async loadHousehold(settingsProvider) {
    const page = settingsProvider.getPage('household');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

  async loadPatient(settingsProvider) {
    const page = settingsProvider.getPage('patient');
    const commonElements = settingsProvider.getCommonElements();
    await super.loadAndAssertPage(page, commonElements);
  }

  async submitPatientReport(settingsProvider) {
    const form = settingsProvider.getForm('patientReport');
    const commonElements = settingsProvider.getCommonElements();
    await super.fillUpForm(form, commonElements);
  }

  async createPatient(settingsProvider) {
    const form = settingsProvider.getForm('patientContact');
    const commonElements = settingsProvider.getCommonElements();
    await super.fillUpForm(form, commonElements);
  }

  async searchContact(settingsProvider) {
    const page = settingsProvider.getPage('contactList');
    const commonElements = settingsProvider.getCommonElements();
    await super.search(page, commonElements);
  }

}

module.exports = new ContactsPage();
