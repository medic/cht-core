const Page = require('@page-objects/apdex/page');
const CONTACT_LIST = 'contactList';
const CHW_AREA = 'chwArea';
const HOUSEHOLD = 'household';
const PATIENT = 'patient';
const PATIENT_REPORT = 'patientReport';
const PATIENT_CONTACT = 'patientContact';

class ContactsPage extends Page {

  async loadContactList(settingsProvider) {
    await super.loadPage(settingsProvider, CONTACT_LIST);
  }

  async loadChwArea(settingsProvider) {
    await super.loadPage(settingsProvider, CHW_AREA);
  }

  async loadHousehold(settingsProvider) {
    await super.loadPage(settingsProvider, HOUSEHOLD);
  }

  async loadPatient(settingsProvider) {
    await super.loadPage(settingsProvider, PATIENT);
  }

  async searchContact(settingsProvider) {
    await super.searchPage(settingsProvider, CONTACT_LIST);
  }

  async submitPatientReport(settingsProvider) {
    await super.loadForm(settingsProvider, PATIENT_REPORT);
  }

  async createPatient(settingsProvider) {
    await super.loadForm(settingsProvider, PATIENT_CONTACT);
  }

}

module.exports = new ContactsPage();
