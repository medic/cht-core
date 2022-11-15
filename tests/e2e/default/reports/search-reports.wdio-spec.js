const searchPage = require('../../../page-objects/default/search/search.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const utils = require('../../../utils');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const moment = require('moment');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const places = placeFactory.generateHierarchy();

//Add two more health_center
const sittuHospital = placeFactory.place().build({
  name: 'Sittu Hospital',
  type: 'district_hospital',
  parent: {
    _id: '',
    parent: {
      _id: ''
    }
  }
});

const potuHospital = placeFactory.place().build({
  name: 'Potu Hospital',
  type: 'district_hospital',
  parent: {
    _id: '',
    parent: {
      _id: ''
    }
  }
});

const sittuPerson = personFactory.build(
  {
    name: 'Sittu',
    patient_id: 'sittu-patient',
    parent: {
      _id: sittuHospital._id,
      parent: sittuHospital.parent
    }
  });
const potuPerson = personFactory.build(
  {
    name: 'Potu',
    patient_id: 'potu-patient',
    parent: {
      _id: potuHospital._id,
      parent: potuHospital.parent
    }
  });

const PHONE_NO = '1234340002';

const REPORT1 = {
  _id: 'REF_REF_V1',
  form: 'RR',
  type: 'data_record',
  from: PHONE_NO,
  fields: {
    patient_id: sittuPerson.patient_id
  },
  sms_message: {
    message_id: 23,
    from: PHONE_NO,
    message: `1!RR!${sittuPerson.patient_id}`,
    form: 'RR',
    locale: 'en'
  },
  reported_date: moment().subtract(10, 'minutes').valueOf()
};

const REPORT2 = {
  _id: 'REF_REF_V2',
  form: 'RR',
  type: 'data_record',
  from: PHONE_NO,
  fields: {
    patient_id: potuPerson.patient_id
  },
  sms_message: {
    message_id: 23,
    from: PHONE_NO,
    message: `1!RR!${potuPerson.patient_id}`,
    form: 'RR',
    locale: 'en'
  },
  reported_date: moment().subtract(10, 'minutes').valueOf()
};

const docs = [...places.values(), sittuHospital, sittuPerson, potuHospital, potuPerson, REPORT1, REPORT2];

describe('Test Reports Search Functionality', async () => {
  before(async () => {
    await utils.saveDocs(docs);
    await loginPage.cookieLogin();
    await commonPage.goToReports();
  });

  it('search by NON empty string should display results with contains match and then clears', async () => {
    // Waiting for initial load
    await reportsPage.getAllReportsText();

    // Searching by keyword
    await searchPage.performSearch('sittu');
    let allLHSContacts = await reportsPage.getAllReportsText();
    expect(allLHSContacts.sort()).to.deep.equal([sittuPerson.name]);

    // Clearing
    await searchPage.clearSearch();
    allLHSContacts = await reportsPage.getAllReportsText();
    expect(allLHSContacts.sort()).to.deep.equal([potuPerson.name, sittuPerson.name]);
  });
});
