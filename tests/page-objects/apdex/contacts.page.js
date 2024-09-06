const Page = require('@page-objects/apdex/page');
const CONTACT_LIST = 'contactList';
const CHW_AREA = 'chwArea';
const HOUSEHOLD = 'household';
const PATIENT = 'patient';
const PATIENT_REPORT = 'patientReport';
const PATIENT_CONTACT = 'patientContact';

class ContactsPage extends Page {

  async loadContactList() {
    await super.loadPage(CONTACT_LIST);
  }

  async loadChwArea() {
    await super.loadPage(CHW_AREA);
  }

  async loadHousehold() {
    await super.loadPage(HOUSEHOLD);
  }

  async loadPatient() {
    await super.loadPage(PATIENT);
  }

  async searchContact() {
    await super.searchPage(CONTACT_LIST);
  }

  async submitPatientReport() {
    await super.loadForm(PATIENT_REPORT);
  }

  async createPatient() {
    await super.loadForm(PATIENT_CONTACT);
  }

}

module.exports = new ContactsPage();
