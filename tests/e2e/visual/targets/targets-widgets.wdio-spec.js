const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const pregnancyVisitFactory = require('@factories/cht/reports/pregnancy-visit');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const deliveryFactory = require('@factories/cht/reports/delivery');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');
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

  const numberOfPatients = 12;
  const patients = Array.from({ length: numberOfPatients }, () => personFactory.build({
    parent: { _id: healthCenter._id, parent: healthCenter.parent }
  }));

  const reports = [
    // patients 0-7: pregnancies with 0 ANC visits → drives ANC % to 0%
    ...patients.slice(0, 8).map(patient => pregnancyFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
        anc_visits_hf: {
          anc_visits_hf_past: {
            visited_hf_count: '0',
          }
        }
      }
    })),

    // patients 8-11: pregnancies with 4+ ANC visits
    ...patients.slice(8, 12).map(patient => pregnancyFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
        anc_visits_hf: {
          anc_visits_hf_past: {
            visited_hf_count: '4',
          }
        }
      }
    })),

    // Multiple pregnancy visits for patient[8] to show visit count widget
    pregnancyVisitFactory.build({
      fields: {
        patient_id: patients[8]._id,
        patient_uuid: patients[8]._id,
        patient_name: patients[8].name
      }
    }),
    pregnancyVisitFactory.build({
      fields: {
        patient_id: patients[8]._id,
        patient_uuid: patients[8]._id,
        patient_name: patients[8].name
      }
    }),
    pregnancyVisitFactory.build({
      fields: {
        patient_id: patients[9]._id,
        patient_uuid: patients[9]._id,
        patient_name: patients[9].name
      }
    }),

    // ALL deliveries are at home → forces 100% home delivery widget
    ...patients.slice(0, 12).map(patient => deliveryFactory.build({
      fields: {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
        delivery_outcome: {
          delivery_place: 'home'
        },
        data: {
          __delivery_place: 'home'
        }
      }
    })),
  ];

  before(async () => {
    await utils.saveDocs([...places.values(), ...reports, ...patients]);
    await utils.createUsers([offlineUser]);
    await loginPage.login(offlineUser);
  });

  after(async () => {
    await utils.revertDb([/^form:/], true);
    await utils.deleteUsers([offlineUser]);
  });

  it('should show zero percent ANC completion and full home delivery widget states', async () => {
    await commonPage.waitForPageLoaded();
    await commonPage.goToAnalytics();
    await commonPage.waitForPageLoaded();
    await browser.pause(5000);
    await generateScreenshot('targets', 'widgets');
  });
});
