const utils = require('../../../utils');
const commonElements = require('../../../page-objects/default/common/common.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');
const moment = require('moment');
const sentinelUtils = require('../../../utils/sentinel');
const loginWdioPage = require('../../../page-objects/default/login/login.wdio.page');

describe('Reports Summary', () => {
  const PHONE_CAROL = '+64271234567';
  const PHONE_JOHN = '+40788232323';

  // contacts
  const DISTRICT = {
    _id: 'district',
    type: 'district_hospital',
    parent: '',
    name: 'District'
  };

  const HEALTH_CENTER = {
    _id: 'health-center',
    type: 'health_center',
    name: 'Health Center',
    parent: { _id: DISTRICT._id }
  };

  const BOB_PLACE = {
    _id: 'bob-contact',
    reported_date: 1,
    type: 'clinic',
    name: 'Bob Place',
    place_id: 'bob_place',
    parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } }
  };

  const TAG_PLACE = {
    _id: 'tag-contact',
    reported_date: 1,
    type: 'clinic',
    name: 'TAG Place',
    place_id: 'tag-place',
    parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } }
  };

  const CAROL = {
    _id: 'carol-contact',
    reported_date: 1,
    type: 'person',
    phone: PHONE_CAROL,
    name: 'Carol Carolina',
    parent: { _id: BOB_PLACE._id, parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } } },
    patient_id: '05946',
    sex: 'f',
    date_of_birth: 1462333250374
  };

  const JOHN = {
    _id: 'john-contact',
    reported_date: 1,
    type: 'person',
    phone: PHONE_JOHN,
    name: 'Johnny Silverhand',
    parent: { _id: TAG_PLACE._id, parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } } },
    patient_id: '05947',
    sex: 'm',
    date_of_birth: 1462333250374
  };

  const MARIA = {
    _id: 'maria-patient',
    reported_date: 1,
    type: 'person',
    name: 'Maria Pecan',
    parent: { _id: TAG_PLACE._id, parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } } },
    patient_id: '123456',
    sex: 'f',
    date_of_birth: 1462333250374
  };

  const ROBERT = {
    _id: 'robert-patient',
    reported_date: 1,
    type: 'person',
    name: 'Robert Linder',
    parent: { _id: BOB_PLACE._id, parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } } },
    patient_id: '654321',
    sex: 'm',
    date_of_birth: 1462333250374
  };

  const GEORGE = {
    name: 'George'
  };

  const CONTACTS = [DISTRICT, HEALTH_CENTER, BOB_PLACE, TAG_PLACE, CAROL, MARIA, JOHN, ROBERT];
  const CONFIG = {
    transitions: {
      accept_patient_reports: {
        load: './transitions/accept_patient_reports.js'
      },
      conditional_alerts: {
        load: './transitions/conditional_alerts.js'
      },
      default_responses: {
        load: './transitions/default_responses.js'
      },
      update_sent_by: {
        load: './transitions/update_sent_by.js'
      },
      registration: {
        load: './transitions/registration.js'
      },
      update_clinics: {
        load: './transitions/update_clinics.js'
      },
      update_notifications: {
        load: './transitions/update_notifications.js'
      },
      update_scheduled_reports: {
        load: './transitions/update_scheduled_reports.js'
      }
    },
    forms: {
      R: {
        meta: {
          code: 'RR',
          label: {
            en: 'REF_REF'
          }
        },
        fields: {
          patient_id: {
            labels: {
              tiny: {
                en: 'R'
              },
              description: {
                en: 'Patient ID'
              },
              short: {
                en: 'ID'
              }
            },
            position: 0,
            type: 'string',
            length: [1, 30],
            required: true
          },
        },
        public_form: true,
        use_sentinel: true
      },
      N: {
        meta: {
          code: 'NN',
          label: {
            en: 'NAM_NAM'
          }
        },
        fields: {
          patient_name: {
            labels: {
              tiny: {
                en: 'N'
              },
              description: {
                en: 'Patient name'
              },
              short: {
                en: 'Name'
              }
            },
            position: 0,
            type: 'string',
            length: [1, 30],
            required: true
          },
        },
        public_form: true,
        use_sentinel: true
      },
      P: {
        meta: {
          code: 'P',
          label: {
            en: 'PID_PID'
          }
        },
        fields: {
          place_id: {
            labels: {
              tiny: {
                en: 'P'
              },
              description: {
                en: 'Place ID'
              },
              short: {
                en: 'Place'
              }
            },
            position: 0,
            type: 'string',
            length: [1, 30],
            required: true
          },
        },
        public_form: true,
        use_sentinel: true
      },
      S: {
        meta: {
          code: 'S',
          label: {
            en: 'SURVEY'
          }
        },
        fields: {
          survey_subject: {
            labels: {
              tiny: {
                en: 'S'
              },
              description: {
                en: 'Survey subject'
              },
              short: {
                en: 'Subject'
              }
            },
            position: 0,
            type: 'string',
            length: [1, 30],
            required: true
          },
        },
        public_form: true,
        use_sentinel: true
      }
    },
    registrations: []
  };

  const testLineageList = async (lineageList) => {
    for (let i = 0; i < lineageList.length; i++) {
      const contentText = await $(`#reports-list li .detail .lineage li:nth-child(${i + 1})`);
      expect( await contentText.getText()).to.equal(lineageList[i]);
    }
  };

  const testLineageSummary = async (summaryList) => {
    for (let i = 0; i < summaryList.length; i++) {
      const contentText = await $(`#reports-content .item-summary .position .lineage li:nth-child(${i + 1})`);
      expect(await contentText.getText()).to.equal(summaryList[i]);
    }
  };

  const saveReport = (report) => {
    return utils.saveDoc(report);
  };

  const waitElementTextEquals = async (elementGetter, expectedText) => await browser.waitUntil(async () =>  
    await elementGetter.getText() === expectedText);
 
  /**
   * Since the LHS might be refreshed, random StaleElementReferenceErrors were frequent enough,
   * to do something about them.
   * @param element
   * @param attempt
   * @returns {Promise<* | undefined>}
   */
 
  before(async () => {
    await utils.updateSettings(CONFIG, true);
    await utils.saveDocs(CONTACTS);
    await loginWdioPage.cookieLogin();
  });

  afterEach(() => {
    return utils.deleteAllDocs(CONTACTS.map(contact => contact._id)); // deletes all except these docs
  });

  describe('Displays correct LHS and RHS summary', () => {
    it('Concerning reports using patient_id', async () => {
      const REPORT = {
        _id: 'REF_REF_V1',
        form: 'RR',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          patient_id: MARIA.patient_id
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!RR!${MARIA.patient_id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(10, 'minutes').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      //await commonElements.goToReports();

      await commonElements.goToReports();
      
      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal(MARIA.name);
      expect(await firstReport.form).to.equal('REF_REF');
      //shows subject lineage breadcrumbs
      await testLineageList(['TAG Place', 'Health Center', 'District']);

      //RHS
      //await browser.wait(() => getElementText(reportsPage.submitterPhone()), 10000);
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(MARIA.name);
      expect(await reportsPage.getReportType()).to.equal('REF_REF');

      await testLineageSummary(['TAG Place', 'Health Center', 'District']);
      expect(await (await reportsPage.submitterName()).getText()).to.contain(`Submitted by ${CAROL.name}`);
      expect(await (await reportsPage.submitterPhone()).getText()).to.contain(CAROL.phone);
      expect(await (await reportsPage.submitterPlace()).getText()).to.contain(TAG_PLACE.name);
     
    });

    it('Concerning reports using doc id', async () => {
      const REPORT = {
        _id: 'REF_REF_V2',
        form: 'RR',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          patient_id: MARIA._id
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!RR!${MARIA._id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(20, 'minutes').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal(MARIA.name);
      expect(await firstReport.form).to.equal('REF_REF');
      //shows subject lineage breadcrumbs
      await testLineageList(['TAG Place', 'Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(MARIA.name);
      expect(await reportsPage.getReportType()).to.equal('REF_REF');

      await testLineageSummary(['TAG Place', 'Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${CAROL.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);
    });

    it('Concerning reports with unknown patient_id', async () => {
      const REPORT = {
        _id: 'REF_REF_I',
        form: 'RR',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          patient_id: '111111'
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!RR!${MARIA.patient_id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(30, 'minutes').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal('Unknown subject');
      expect(await firstReport.form).to.equal('REF_REF');
      //shows subject lineage breadcrumbs
      await testLineageList(['Bob Place', 'Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal('Unknown subject');
      expect(await reportsPage.getReportType()).to.equal('REF_REF');

      await testLineageSummary(['Bob Place', 'Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${CAROL.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);
    });

    it('Concerning reports using patient name', async () => {
      const REPORT = {
        _id: 'NAM_NAM_V',
        form: 'NN',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          patient_name: GEORGE.name
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!NN!${GEORGE.name}`,
          form: 'NN',
          locale: 'en'
        },
        reported_date: moment().subtract(40, 'minutes').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel(REPORT._id);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal(GEORGE.name);
      expect(await firstReport.form).to.equal('NAM_NAM');
      //shows subject lineage breadcrumbs
      await testLineageList(['Bob Place', 'Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(GEORGE.name);
      expect(await reportsPage.getReportType()).to.equal('NAM_NAM');

      await testLineageSummary(['Bob Place', 'Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${CAROL.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);
    });

    it('Concerning reports using missing required patient name', async () => {
      const REPORT = {
        _id: 'NAM_NAM_I',
        form: 'NN',
        type: 'data_record',
        from: PHONE_CAROL,
        errors: [
          {
            fields: 'patient_name',
            code: 'sys.missing_fields'
          }
        ],
        fields: {
          patient_name: ''
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!RR!${MARIA._id}`,
          form: 'NN',
          locale: 'en'
        },
        reported_date: moment().subtract(50, 'minutes').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal('Unknown subject');
      expect(await firstReport.form).to.equal('NAM_NAM');
      //shows subject lineage breadcrumbs
      await testLineageList(['Bob Place', 'Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal('Unknown subject');
      expect(await reportsPage.getReportType()).to.equal('NAM_NAM');

      await testLineageSummary(['Bob Place', 'Health Center', 'District']);
      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${CAROL.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);
    });

    it('Concerning reports using place_id with a place_uuid', async () => {
      const REPORT = {
        _id: 'PREF_PREF_V',
        form: 'P',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          place_id: TAG_PLACE._id
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!P!${TAG_PLACE._id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(60, 'minutes').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal(TAG_PLACE.name);
      expect(await firstReport.form).to.equal('PID_PID');
      //shows subject lineage breadcrumbs
      await testLineageList(['Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(TAG_PLACE.name);
      expect(await reportsPage.getReportType()).to.equal('PID_PID');

      await testLineageSummary(['Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${CAROL.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);
    });

    it('Concerning reports using place_id with a shortcode', async () => {
      const REPORT = {
        _id: 'PREF_PREF_V',
        form: 'P',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          place_id: TAG_PLACE.place_id
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!P!${TAG_PLACE.place_id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(60, 'minutes').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal(TAG_PLACE.name);
      expect(await firstReport.form).to.equal('PID_PID');
      //shows subject lineage breadcrumbs
      await testLineageList(['Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(TAG_PLACE.name);
      expect(await reportsPage.getReportType()).to.equal('PID_PID');

      await testLineageSummary(['Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${CAROL.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);
    });

    it('Concerning reports using unknown place_id', async () => {
      const REPORT = {
        _id: 'PREF_PREF_I',
        form: 'P',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          place_id: '12'
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!P!12`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(2, 'hours').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal('Unknown subject');
      expect(await firstReport.form).to.equal('PID_PID');
      //shows subject lineage breadcrumbs
      await testLineageList(['Bob Place', 'Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal('Unknown subject');
      expect(await reportsPage.getReportType()).to.equal('PID_PID');

      await testLineageSummary(['Bob Place', 'Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${CAROL.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);
    });

    it('Concerning reports which do not have a subject', async () => {
      const REPORT = {
        _id: 'SURVEY_REPORT',
        form: 'S',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          survey_subject: 'something'
        },
        sms_message: {
          message_id: 23,
          from: PHONE_CAROL,
          message: `1!S!something`,
          form: 'S',
          locale: 'en'
        },
        reported_date: moment().subtract(10, 'hours').valueOf()
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal(CAROL.name);
      expect(await firstReport.form).to.equal('SURVEY');
      //shows subject lineage breadcrumbs
      await testLineageList(['Bob Place', 'Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await (await reportsPage.patientName()).isExisting()).to.be.false;
      expect(await firstReport.form).to.equal('SURVEY');

      await testLineageSummary(['Bob Place', 'Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.contain(CAROL.name);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);
    });

    it('Concerning reports which have an unknown sender and have a known subject', async () => {
      const REPORT = {
        _id: 'PID_US',
        form: 'P',
        type: 'data_record',
        from: '555',
        fields: {
          place_id: BOB_PLACE._id
        },
        sms_message: {
          message_id: 23,
          from: '555',
          message: `1!P!${BOB_PLACE._id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(6, 'hours').valueOf()
      };

      await saveReport(REPORT);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal(BOB_PLACE.name);
      expect(await firstReport.form).to.equal('PID_PID');
      //shows subject lineage breadcrumbs
      await testLineageList(['Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(BOB_PLACE.name);
      expect(await reportsPage.getReportType()).to.equal('PID_PID');

      await testLineageSummary(['Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string('555');
      expect(await reportsPage.submitterPhone().getText()).to.equal('');
    });

    it('Concerning reports which have an unknown sender with no phone number', async () => {
      const REPORT = {
        _id: 'PID_USNP',
        form: 'P',
        type: 'data_record',
        from: '',
        fields: {
          place_id: BOB_PLACE._id
        },
        sms_message: {
          message_id: 23,
          from: '',
          message: `1!P!${BOB_PLACE._id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(6, 'hours').valueOf()
      };

      await saveReport(REPORT);
      await commonElements.goToReports();

      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(await firstReport.heading).to.equal(BOB_PLACE.name);
      expect(await firstReport.form).to.equal('PID_PID');

      //shows subject lineage breadcrumbs
      await testLineageList(['Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(BOB_PLACE.name);
      expect(await reportsPage.getReportType()).to.equal('PID_PID');

      await testLineageSummary(['Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string('Unknown sender');
      expect(await reportsPage.submitterPhone().getText()).to.equal('');
    });

    it('Changes to a loaded or list report should be reflected in the UI', async () => {
      const REPORT = {
        _id: 'REF_REF_V3',
        form: 'RR',
        type: 'data_record',
        from: PHONE_CAROL,
        fields: {
          patient_id: MARIA.patient_id
        },
        contact: {
          _id: CAROL._id,
          parent: CAROL.parent,
        },
        reported_date: moment().subtract(10, 'minutes').valueOf(),
      };

      await saveReport(REPORT);
      await sentinelUtils.waitForSentinel([REPORT._id]);
      await commonElements.goToReports();

      // LHS
      const firstReport = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(firstReport.heading).to.equal(MARIA.name);
      expect(await firstReport.form).to.equal('REF_REF');
      //shows subject lineage breadcrumbs
      await testLineageList(['TAG Place', 'Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(MARIA.name);
      expect(await reportsPage.getReportType()).to.equal('REF_REF');

      await testLineageSummary(['TAG Place', 'Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${CAROL.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(CAROL.phone);

      // change both patient and submitter
      const reportDoc = await utils.getDoc(REPORT._id);
      reportDoc.contact = { _id: JOHN._id, parent: JOHN.parent };
      reportDoc.fields.patient_id = ROBERT.patient_id;
      await utils.saveDoc(reportDoc);

      // wait until this is reflected in the UI, without refreshing!
      await waitElementTextEquals($('.subject .name'), ROBERT.name); // LHS updated
      await waitElementTextEquals($('.sender .phone'), JOHN.phone); // RHS updated

      // LHS
      await commonElements.goToReports();
      const report = await reportsPage.getListReportInfo(await reportsPage.firstReport());
      expect(report.heading).to.equal(ROBERT.name);
      //shows subject lineage breadcrumbs
      await testLineageList(['Bob Place', 'Health Center', 'District']);

      //RHS
      await (await reportsPage.firstReport()).click();
      expect(await reportsPage.getReportSubject()).to.equal(ROBERT.name);
      expect(await reportsPage.getReportType()).to.equal('REF_REF');

      await testLineageSummary(['Bob Place', 'Health Center', 'District']);

      expect(await reportsPage.submitterName().getText()).to.have.string(`Submitted by ${JOHN.name}`);
      expect(await reportsPage.submitterPhone().getText()).to.equal(JOHN.phone);
    });
  });
});
