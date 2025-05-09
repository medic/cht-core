const utils = require('@utils');

const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const deliveryHomeFactory = require('@factories/cht/reports/deliveryHome');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const { generateScreenshot } = require('@utils/screenshots');

describe('...', () => {
  // Generate test data (people, pregnancies, deliveries) using functions 
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ username: 'offline-user-nav', roles: [ 'chw' ], place: healthCenter._id });
  const numberOfPatients = 17; // Define  patients 
  const patients = Array.from({ length: numberOfPatients }, () => 
  personFactory.build({ 
    parent: { _id: healthCenter._id, parent: healthCenter.parent } 
  })
);
  const reports = [
    ...patients.map(patient => 
  pregnancyFactory.build({
    fields: { patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name }
    })),  
    deliveryFactory.build({
      fields: { patient_id: patients[1]._id, patient_uuid: patients[1]._id, patient_name: patients[1].name },
    }),
        deliveryFactory.build({
      fields: { patient_id: patients[2]._id, patient_uuid: patients[2]._id, patient_name: patients[2].name },
    }),
        deliveryHomeFactory.build({
      fields: { patient_id: patients[3]._id, patient_uuid: patients[3]._id, patient_name: patients[3].name },
    }),
  ];

  let patientDocs;
  let reportDocs;

  before(async () => {
    await utils.saveDocs([ ...places.values() ]);
    reportDocs = await utils.saveDocs(reports);
    patientDocs = await utils.saveDocs( patients );
    await utils.createUsers([ offlineUser ]);
    await loginPage.login(offlineUser);
  });

  it('should go to Targets and take the screenshots', async () => {
    // Go to Targets
    await commonPage.waitForPageLoaded();
    await commonPage.goToAnalytics();
    await commonPage.waitForPageLoaded();
    await browser.pause(2000);
    // Take the screenshots
    await generateScreenshot('targets', 'overview');
  });
});