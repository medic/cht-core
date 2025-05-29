const utils = require('@utils');
const commonElements = require('@page-objects/default/common/common.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const reportFactory = require('@factories/cht/reports/generic-report');

describe('Reports tab messages', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const healthCenter = places.get('health_center');

  const contact = personFactory.build({ phone: '+12068881234', parent: healthCenter });

  const patient = personFactory.build({
    _id: 'patient_uuid',
    parent: clinic,
    name: 'the_patient',
    patient_id: 'the_patient_id'
  });

  const reports = [
    reportFactory
      .report()
      .build(
        {
          form: 'P',
          content_type: 'xml',
          scheduled_tasks: [{
            due: '2024-05-09T04:30:00.000Z',
            group: 8,
            type: 'ANC Reminders LMP',
            translation_key: 'instance.upgrade.version',
            message_key: 'messages.c.report_accepted',
            recipient: 'clinic',
            state_history: [{
              state: 'scheduled',
              timestamp: '2024-02-26T10:42:41.080Z'
            }],
            state: 'scheduled'
          },]
        },
        {
          patient: { _id: patient._id, patient_id: '' },
          submitter: contact,
          fields: { lmp_date: 'Feb 3, 2022', patient_name: patient.name },
        },
      ),
  ];

  before(async () => {
    await utils.saveDocs([ ...places.values(), contact, patient, ...reports ]);
    await loginPage.cookieLogin();
  });

  it('should generate SMS report correctly when lacking patient_id', async () => {
    await commonElements.goToReports();
    const firstReport = await reportsPage.leftPanelSelectors.firstReport();

    await reportsPage.openSelectedReport(firstReport);
    await commonElements.waitForPageLoaded();
    expect(await reportsPage.rightPanelSelectors.reportTasks().isDisplayed()).to.be.true;

    const scheduledTask = await reportsPage.getTaskDetails(1, 1);
    expect(scheduledTask.message).to.contain('Thank you Mary Smith for registering the_patient. ' +
      'Their ID is the_patient_id. They have been enrolled into the child health schedule.');
  });

});
