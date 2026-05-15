const path = require('path');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
const chtConfUtils = require('@utils/cht-conf');
const { generateScreenshot } = require('@utils/screenshots');
const { CONTACT_TYPES } = require('@medic/constants');

describe('Targets widgets', () => {
  const places = placeFactory.generateHierarchy();
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);
  const offlineUser = userFactory.build({
    username: 'offline-user-targets-widgets',
    roles: ['chw'],
    place: healthCenter._id
  });

  const thisMonth = new Date().toISOString().split('T')[0];

  const numberOfPatients = 12;
  const patients = Array.from({ length: numberOfPatients }, () => personFactory.build({
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  }));

  // person with date_of_death this month → populates deaths-this-month widget
  const deceasedPerson = personFactory.build({
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
    date_of_death: thisMonth
  });

  // person with date_of_birth this month → populates births-this-month widget
  const newbornPerson = personFactory.build({
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
    date_of_birth: thisMonth
  });

  const reports = [
    // patients 0-3: active pregnancies with 0 ANC facility visits
    ...patients.slice(0, 4).map(patient => pregnancyFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
        anc_visits_hf: {
          anc_visits_hf_past: { visited_hf_count: '0' }
        }
      }
    })),

    // patients 4-7: active pregnancies with 1+ ANC facility visits
    ...patients.slice(4, 8).map(patient => pregnancyFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
        anc_visits_hf: {
          anc_visits_hf_past: { visited_hf_count: '1' }
        }
      }
    })),

    // patients 8-9: active pregnancies with 4+ ANC facility visits
    ...patients.slice(8, 10).map(patient => pregnancyFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
        anc_visits_hf: {
          anc_visits_hf_past: { visited_hf_count: '4' }
        }
      }
    })),

    // patient[10]: 1 registration + 7 home visits = 8 total contacts
    // → populates active-pregnancies-8+-contacts widget
    pregnancyFactory.build({
      fields: {
        patient_id: patients[10]._id,
        patient_uuid: patients[10]._id,
        patient_name: patients[10].name,
        anc_visits_hf: {
          anc_visits_hf_past: { visited_hf_count: '0' }
        }
      }
    }),
    ...Array.from({ length: 7 }, () => pregnancyVisitFactory.build({
      fields: {
        patient_id: patients[10]._id,
        patient_uuid: patients[10]._id,
        patient_name: patients[10].name
      }
    })),

    // patients 0-5: home deliveries
    ...patients.slice(0, 6).map(patient => deliveryFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
        delivery_outcome: { delivery_place: 'home' },
        data: { __delivery_place: 'home' }
      }
    })),

    // patients 6-11: facility deliveries → facility-deliveries widget shows 50%
    ...patients.slice(6, 12).map(patient => deliveryFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
        delivery_outcome: { delivery_place: 'health_facility' },
        data: { __delivery_place: 'health_facility' }
      }
    })),
  ];

  const compileTargets = async (targetsFileName) => {
    await chtConfUtils.initializeConfigDir();
    const targetFilePath = path.join(__dirname, `config/${targetsFileName}`);
    return chtConfUtils.compileConfig({ targets: targetFilePath });
  };

  before(async () => {
    await utils.saveDocs([
      ...places.values(),
      ...patients,
      deceasedPerson,
      newbornPerson,
      ...reports
    ]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
    await utils.deleteUsers([offlineUser]);
  });

  afterEach(async () => {
    await utils.revertSettings(true);
  });

  it('should show distinct states for all target widgets', async () => {
    await commonPage.waitForPageLoaded();
    await commonPage.goToAnalytics();
    await commonPage.waitForPageLoaded();
    await browser.pause(2000);
    await generateScreenshot('targets', 'widgets');
  });

  it('should show limit count to goal state for count widgets', async () => {
    // apply config with limit_count_to_goal: true and goal of 3
    // we have 11 active pregnancies which exceeds goal of 3
    // so the widget should display the goal value (3) instead of actual count
    const settings = await compileTargets('targets-limit-count-config.js');
    await utils.updateSettings(settings, { ignoreReload: true, sync: true, refresh: true, revert: true });
    await commonPage.waitForPageLoaded();
    await commonPage.goToAnalytics();
    await commonPage.waitForPageLoaded();
    await browser.pause(2000);
    await generateScreenshot('targets', 'widgets-limit-count');
  });
});
