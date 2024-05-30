const Page = require('./page');

class ContactsPage extends Page {

  async loadContactList(settingsProvider) {
    const page = settingsProvider.getPage('contact-list');
    await super.loadAndAssertPage(page);
  }

  async loadCHWArea(settingsProvider) {
    const page = settingsProvider.getPage('chw-area');
    await super.loadAndAssertPage(page);
  }

  async loadHousehold(settingsProvider) {
    const page = settingsProvider.getPage('household');
    await super.loadAndAssertPage(page);
  }

  async loadPatient(settingsProvider) {
    const page = settingsProvider.getPage('patient');
    await super.loadAndAssertPage(page);
  }

  async submitPatientReport(settingsProvider) {
    const form = settingsProvider.getForm('patientReport');
    const commonElements = settingsProvider.getCommonElements();
    await super.fillUpForm(form, commonElements);
  }

  async createPatient(settingsProvider) {
    const page = settingsProvider.getPage('household');
    await super.loadAndAssertPage(page);

    const form = settingsProvider.getForm('patientContact');
    const commonElements = settingsProvider.getCommonElements();
    await super.fillUpForm(form, commonElements);
  }

  async searchPatient(settingsProvider) {
    const form = settingsProvider.getForm('patientSearch');
    await super.searchContact(form);
  }

}

module.exports = new ContactsPage();
