const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
// const analyticsPage = require('@page-objects/default/analytics/analytics.wdio.page');
// const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
// const reportFactory = require('@factories/cht/reports/generic-report');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const { generateScreenshot } = require('@utils/screenshots');
// const { reports } = require('../reports/data/generateReportData');

describe('Targets Widgets', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get('health_center');
  const offlineUser = userFactory.build({ username: 'offline-user-nav', roles: [ 'chw' ], place: healthCenter._id });
  const patients =Array.from({ length: 20 }, () => personFactory.build({
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  }));

  const defaultReport = [
    ...patients.slice(0, 5).map(patient => pregnancyFactory.build({
      fields: { patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name }
    })),
    ...patients.slice(0, 13).map(patient => deliveryFactory.build({
      fields: {patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name}
    })),
    ...patients.slice(13, 20).map(patient => deliveryFactory.build({
      fields: { patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name,
        delivery_outcome: {
          delivery_place: 'home'
        },
        data: {
          __delivery_place: 'home'
        }},
    })),
  ];

  const goalsReport = [
    ...patients.map(patient => deliveryFactory.build({
      fields: { patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name }
    })),
    ...patients.map(patient => pregnancyFactory.build({
      fields: { patient_id: patient._id, patient_uuid: patient._id, patient_name: patient.name }
    })),
  ];

  const emptyReport = [];

  before(async () => {
    await utils.saveDocs([ ...places.values(), ...patients, ...defaultReport ]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  afterEach(async () => {
    await utils.revertDb([/^form:/], true);
  });

  it('should go to Targets and take the screenshots with default data', async () => {
    await commonPage.goToAnalytics();
    await commonPage.waitForPageLoaded();
    await browser.pause(2000);
    await generateScreenshot('targets', 'widgets-default');
  });

  it('should go to Targets and take the screenshots without data', async () => {
    await utils.saveDocs([ ...places.values(), ...patients, ...emptyReport ]);
    await commonPage.sync({reload: true});
    await commonPage.goToAnalytics();
    await commonPage.waitForPageLoaded();
    await browser.pause(2000);
    await generateScreenshot('targets', 'widgets-empty');
  });

  xit('should go to Targets and take the screenshots showing widgets with goals', async () => {
    await utils.saveDocs([ ...places.values(), ...patients, ...goalsReport ]);
    await commonPage.sync({reload: true});
    await commonPage.goToAnalytics();
    await commonPage.waitForPageLoaded();
    const goalTarget = await $('.target-progress');
    await goalTarget.scrollIntoView();
    await browser.pause(2000);
    await generateScreenshot('targets', 'widgets-goals');
  });
});
