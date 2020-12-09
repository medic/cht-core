const utils = require('../utils');
const commonElements = require('../page-objects/common/common.po.js');
const reportsTab = require('../page-objects/reports/reports.po');
const helper = require('../helper');
const moment = require('moment');

describe('Reports Summary', () => {
  const PHONE = '+64271234567';

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
    parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } }
  };

  const TAG_PLACE = {
    _id: 'tag-contact',
    reported_date: 1,
    type: 'clinic',
    name: 'TAG Place',
    parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } }
  };

  const CAROL = {
    _id: 'carol-contact',
    reported_date: 1,
    type: 'person',
    phone: PHONE,
    name: 'Carol Carolina',
    parent: { _id: BOB_PLACE._id, parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } } },
    patient_id: '05946',
    sex: 'f',
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

  const GEORGE = {
    name: 'George'
  };

  const CONTACTS = [DISTRICT, HEALTH_CENTER, BOB_PLACE, TAG_PLACE, CAROL, MARIA];
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
      },
      update_sent_forms: {
        load: './transitions/update_sent_forms.js'
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

  const testListLineage = (expected) => {
    expected.forEach((parent, key) => {
      expect(getElementText(element(by.css('#reports-list li .detail .lineage li:nth-child('+ (key + 1) +')'))))
        .toBe(parent);
    });
  };

  const testSummaryLineage = (expected) => {
    expected.forEach((parent, key) => {
      const css = '#reports-content .item-summary .position .lineage li:nth-child('+ (key + 1) +')';
      expect(getElementText(element(by.css(css))))
        .toBe(parent);
    });
  };

  const saveReport = (report) => {
    return utils.saveDoc(report);
  };

  const loadReport = () => {
    commonElements.goToReports(true);
    helper.waitElementToBeClickable(element(by.css('#reports-list .unfiltered li .summary')));
    helper.clickElement(element(by.css('#reports-list .unfiltered li .summary')));
    helper.waitElementToPresent(element(by.css('#reports-content .item-summary')), 3000);
    return Promise.resolve();
  };

  // wait till report was seen by sentinel
  // Sometimes, sentinel processes the report after the report is set as selected, but before the report-content
  // controller change feed listener is set up. Result is that the report-content is never updated with the new data
  // To counter this, we reload the page after we wait for the change for the first time.
  const waitForSentinel = () => {
    return browser
      .wait(() => element(
        by.cssContainingText('#reports-content .item-summary .sender .phone', CAROL.phone)).isPresent(),
      10000
      )
      .catch(loadReport);
  };

  // since the LHS might be refreshed, random StaleElementReferenceErrors were frequent enough
  // to do something about them.
  const getElementText = (elm, attempt) => {
    attempt = attempt || 0;

    return helper.getTextFromElement(elm)
      .then((text) => {
        return text;
      }, (err) => {
        if (attempt < 2) {
          return getElementText(elm, attempt+1);
        }
        throw err;
      });
  };

  beforeAll(done => {
    utils.updateSettings(CONFIG)
      .then(() => protractor.promise.all(CONTACTS.map(utils.saveDoc)))
      .then(() => {
        //wait till change feed receives all the contacts we created
        setTimeout(done, 5000);
      })
      .catch(done.fail);
  });

  afterAll(utils.afterEach);

  afterEach(() => {
    return utils.deleteAllDocs(CONTACTS.map(contact => contact._id)); // deletes all except these docs
  });

  describe('Displays correct LHS and RHS summary', () => {
    it('Concerning reports using patient_id', async () => {
      const REPORT = {
        _id: 'REF_REF_V1',
        form: 'RR',
        type: 'data_record',
        from: PHONE,
        fields: {
          patient_id: MARIA.patient_id
        },
        sms_message: {
          message_id: 23,
          from: PHONE,
          message: `1!RR!${MARIA.patient_id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(10, 'minutes').valueOf()
      };
      await commonElements.goToReports();
      await saveReport(REPORT);
      const report = await reportsTab.loadReport(REPORT._id);
      await waitForSentinel();
      expect(getElementText(await reportsTab.subject(report))).toBe(MARIA.name);
      
      expect(getElementText(await reportsTab.formName(report))).toBe('REF_REF');
      //shows subject lineage breadcrumbs
      testListLineage(['TAG Place', 'Health Center', 'District']);

      //RHS
      browser.wait(() => getElementText(reportsTab.submitterPhone),10000);
      expect(getElementText(await reportsTab.subjectName)).toBe(MARIA.name);
      expect(getElementText(await reportsTab.summaryFormName)).toBe('REF_REF');
      testSummaryLineage(['TAG Place', 'Health Center', 'District']);
      expect(getElementText(await reportsTab.submitterName)).toMatch(`Submitted by ${CAROL.name}`);
      expect(getElementText(await reportsTab.submitterPhone)).toBe(CAROL.phone);
    });

    it('Concerning reports using doc id', () => {
      const REPORT = {
        _id: 'REF_REF_V2',
        form: 'RR',
        type: 'data_record',
        from: PHONE,
        fields: {
          patient_id: MARIA._id
        },
        sms_message: {
          message_id: 23,
          from: PHONE,
          message: `1!RR!${MARIA._id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(20, 'minutes').valueOf()
      };

      return saveReport(REPORT)
        .then(loadReport)
        .then(waitForSentinel)
        .then(() => {
          //LHS
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe(MARIA.name);
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('REF_REF');
          //shows subject lineage breadcrumbs
          testListLineage(['TAG Place', 'Health Center', 'District']);

          //RHS
          expect(getElementText('#reports-content .item-summary .subject .name')).toBe(MARIA.name);
          expect(getElementText('#reports-content .item-summary .subject + div')).toBe('REF_REF');
          testSummaryLineage(['TAG Place', 'Health Center', 'District']);
          expect(getElementText('#reports-content .item-summary .sender .name')).toMatch(`${CAROL.name}`);
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe(CAROL.phone);
        });
    });

    it('Concerning reports with unknown patient_id', () => {
      const REPORT = {
        _id: 'REF_REF_I',
        form: 'RR',
        type: 'data_record',
        from: PHONE,
        fields: {
          patient_id: '111111'
        },
        sms_message: {
          message_id: 23,
          from: PHONE,
          message: `1!RR!${MARIA.patient_id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(30, 'minutes').valueOf()
      };

      return saveReport(REPORT)
        .then(loadReport)
        .then(waitForSentinel)
        .then(() => {
          //LHS
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe('Unknown subject');
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('REF_REF');
          //shows submitter lineage breadcrumbs
          testListLineage(['Bob Place', 'Health Center', 'District']);

          //RHS
          expect(getElementText('#reports-content .item-summary .subject .name')).toBe('Unknown subject');
          expect(getElementText('#reports-content .item-summary .subject + div')).toBe('REF_REF');
          testSummaryLineage(['Bob Place', 'Health Center', 'District']);
          expect(getElementText('#reports-content .item-summary .sender .name')).toMatch(`${CAROL.name}`);
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe(CAROL.phone);
        });
    });

    it('Concerning reports using patient name', () => {
      const REPORT = {
        _id: 'NAM_NAM_V',
        form: 'NN',
        type: 'data_record',
        from: PHONE,
        fields: {
          patient_name: GEORGE.name
        },
        sms_message: {
          message_id: 23,
          from: PHONE,
          message: `1!NN!${GEORGE.name}`,
          form: 'NN',
          locale: 'en'
        },
        reported_date: moment().subtract(40, 'minutes').valueOf()
      };


      return saveReport(REPORT)
        .then(loadReport)
        .then(waitForSentinel)
        .then(() => {
          //LHS
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe(GEORGE.name);
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('NAM_NAM');
          //shows submitter lineage breadcrumbs
          testListLineage(['Bob Place', 'Health Center', 'District']);

          //RHS
          expect(getElementText('#reports-content .item-summary .subject .name')).toBe(GEORGE.name);
          expect(getElementText('#reports-content .item-summary .subject + div')).toBe('NAM_NAM');
          testSummaryLineage(['Bob Place', 'Health Center', 'District']);
          expect(getElementText('#reports-content .item-summary .sender .name')).toMatch(`${CAROL.name}`);
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe(CAROL.phone);
        });
    });

    it('Concerning reports using missing required patient name', () => {
      const REPORT = {
        _id: 'NAM_NAM_I',
        form: 'NN',
        type: 'data_record',
        from: PHONE,
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
          from: PHONE,
          message: `1!RR!${MARIA._id}`,
          form: 'NN',
          locale: 'en'
        },
        reported_date: moment().subtract(50, 'minutes').valueOf()
      };

      return saveReport(REPORT)
        .then(loadReport)
        .then(waitForSentinel)
        .then(() => {
          //LHS
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe('Unknown subject');
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('NAM_NAM');
          //shows subject lineage breadcrumbs
          testListLineage(['Bob Place', 'Health Center', 'District']);

          //RHS
          expect(getElementText('#reports-content .item-summary .subject .name')).toBe('Unknown subject');
          expect(getElementText('#reports-content .item-summary .subject + div')).toBe('NAM_NAM');
          testSummaryLineage(['Bob Place', 'Health Center', 'District']);
          expect(getElementText('#reports-content .item-summary .sender .name')).toMatch(`${CAROL.name}`);
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe(CAROL.phone);
        });
    });

    it('Concerning reports using place_id', () => {
      const REPORT = {
        _id: 'PREF_PREF_V',
        form: 'P',
        type: 'data_record',
        from: PHONE,
        fields: {
          place_id: TAG_PLACE._id
        },
        sms_message: {
          message_id: 23,
          from: PHONE,
          message: `1!P!${TAG_PLACE._id}`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(60, 'minutes').valueOf()
      };

      return saveReport(REPORT)
        .then(loadReport)
        .then(waitForSentinel)
        .then(() => {
          //LHS
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe(TAG_PLACE.name);
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('PID_PID');
          //shows subject lineage breadcrumbs
          testListLineage(['Health Center', 'District']);

          //RHS
          expect(getElementText('#reports-content .item-summary .subject .name')).toBe(TAG_PLACE.name);
          expect(getElementText('#reports-content .item-summary .subject + div')).toBe('PID_PID');
          testSummaryLineage(['Health Center', 'District']);
          expect(getElementText('#reports-content .item-summary .sender .name')).toMatch(`${CAROL.name}`);
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe(CAROL.phone);
        });
    });

    it('Concerning reports using unknown place_id', () => {
      const REPORT = {
        _id: 'PREF_PREF_I',
        form: 'P',
        type: 'data_record',
        from: PHONE,
        fields: {
          place_id: '12'
        },
        sms_message: {
          message_id: 23,
          from: PHONE,
          message: `1!P!12`,
          form: 'RR',
          locale: 'en'
        },
        reported_date: moment().subtract(2, 'hours').valueOf()
      };

      return saveReport(REPORT)
        .then(loadReport)
        .then(waitForSentinel)
        .then(() => {
          //LHS
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe('Unknown subject');
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('PID_PID');
          //shows submitter lineage breadcrumbs
          testListLineage(['Bob Place', 'Health Center', 'District']);

          //RHS
          expect(getElementText('#reports-content .item-summary .subject .name')).toBe('Unknown subject');
          expect(getElementText('#reports-content .item-summary .subject + div')).toBe('PID_PID');
          testSummaryLineage(['Bob Place', 'Health Center', 'District']);
          expect(getElementText('#reports-content .item-summary .sender .name')).toMatch(`${CAROL.name}`);
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe(CAROL.phone);
        });
    });

    it('Concerning reports which do not have a subject', () => {
      const REPORT = {
        _id: 'SURVEY_REPORT',
        form: 'S',
        type: 'data_record',
        from: PHONE,
        fields: {
          survey_subject: 'something'
        },
        sms_message: {
          message_id: 23,
          from: PHONE,
          message: `1!S!something`,
          form: 'S',
          locale: 'en'
        },
        reported_date: moment().subtract(10, 'hours').valueOf()
      };

      return saveReport(REPORT)
        .then(loadReport)
        .then(waitForSentinel)
        .then(() => {
          //LHS - shows submitter information when report has no subject
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe(CAROL.name);
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('SURVEY');
          testListLineage(['Bob Place', 'Health Center', 'District']);

          //RHS - shows submitter information when report has no subject
          expect(getElementText('#reports-content .item-summary .sender .name')).toBe(CAROL.name);
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe(CAROL.phone);
          expect(getElementText('#reports-content .item-summary mm-sender + div')).toBe('SURVEY');
          testSummaryLineage(['Bob Place', 'Health Center', 'District']);
          expect(element(by.css('#reports-content .item-summary .subject')).isPresent()).toBe(false);
        });
    });

    it('Concerning reports which have an unknown sender and have a known subject', () => {
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

      return saveReport(REPORT)
        .then(loadReport)
        .then(() => {
          //LHS
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe(BOB_PLACE.name);
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('PID_PID');
          //shows submitter lineage breadcrumbs
          testListLineage(['Health Center', 'District']);

          //RHS
          expect(getElementText('#reports-content .item-summary .subject .name')).toBe(BOB_PLACE.name);
          expect(getElementText('#reports-content .item-summary .subject + div')).toBe('PID_PID');
          testSummaryLineage(['Health Center', 'District']);
          expect(getElementText('#reports-content .item-summary .sender .name')).toMatch('555');
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe('');
        });
    });

    it('Concerning reports which have an unknown sender with no phone number', () => {
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

      return saveReport(REPORT)
        .then(loadReport)
        .then(() => {
          //LHS
          expect(getElementText('#reports-list .unfiltered li .content .heading h4 span')).toBe(BOB_PLACE.name);
          expect(getElementText('#reports-list .unfiltered li .summary')).toBe('PID_PID');
          //shows submitter lineage breadcrumbs
          testListLineage(['Health Center', 'District']);

          //RHS
          expect(getElementText('#reports-content .item-summary .subject .name')).toBe(BOB_PLACE.name);
          expect(getElementText('#reports-content .item-summary .subject + div')).toBe('PID_PID');
          testSummaryLineage(['Health Center', 'District']);
          expect(getElementText('#reports-content .item-summary .sender .name')).toBe('Unknown sender');
          expect(getElementText('#reports-content .item-summary .sender .phone')).toBe('');
        });
    });
  });
});
