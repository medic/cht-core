const utils = require('../../utils');
const commonElements = require('../../page-objects/common/common.po');
const loginPage = require('../../page-objects/login/login.po');
const contactsPage = require('../../page-objects/contacts/contacts.po');
const helper = require('../../helper');
const pregnancyFormPo = require('../../page-objects/forms/cht/pregnancy-form.po');

const password = 'Secret_1';
const district = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Dist 1',
};

const pregnancy_woman =  {
  _id: 'test_woman',
  parent: {
    _id: 'clinic1',
    parent: {
      _id: 'offline_health_center',
      parent: {
        _id: 'PARENT_PLACE'
      }
    }
  },
  type: 'person',
  name: 'Mary Smith',
  date_of_birth: '2000-02-01',
  ephemeral_dob: {
    dob_calendar: '2000-02-01',
    ephemeral_months: 3,
    ephemeral_years: 2021,
    dob_approx: '2021-03-30',
    dob_raw: '2000-02-01',
    dob_iso: '2000-02-01'
  },
  sex: 'female',
  patient_id: 'test_woman_1'
};

const clinic = {
  _id: 'clinic1',
  type: 'clinic',
  name: 'Clinic1',
  parent: { _id: 'offline_health_center'},
  reported_date: 100,
};


const docs = [
  clinic,
  pregnancy_woman,
  district
];

const users = [
  {
    username: 'user1',
    password: password,
    place: {
      _id: 'offline_health_center',
      type: 'health_center',
      name: 'Offline place',
      parent: 'PARENT_PLACE'
    },
    contact: {
      _id: 'fixture:user:user1',
      name: 'OfflineUser'
    },
    roles: ['chw']
  },
];

describe('Pregnancy workflow on cht : ', () => {
  beforeAll(async () => {
    await utils.saveDocs([...docs]);
    await utils.createUsers(users);
  });

  it('should register a pregnancy', async () => {
    await console.log('do');
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative('user1', password);
    await utils.closeTour();
    await commonElements.goToPeople();
    await contactsPage.selectLHSRowByText(clinic.name);
    await contactsPage.selectContactByName(pregnancy_woman.name);
    await helper.clickElementNative(contactsPage.newActions);
    await helper.clickElementNative(contactsPage.formById('pregnancy'));
    await pregnancyFormPo.fillPregnancyForm();
    
  });
});
