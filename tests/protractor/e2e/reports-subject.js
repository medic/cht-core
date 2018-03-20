const utils = require('../utils'),
      commonElements = require('../page-objects/common/common.po.js'),
      helper = require('../helper'),
      moment = require('moment');

describe('Reports Summary', () => {

  'use strict';

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
      }
    },
    registrations: []
  };

  const REF_REF_V1 = {
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

  const REF_REF_V2 = {
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

  const REF_REF_I = {
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

  const NAM_NAM_V = {
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

  const NAM_NAM_I = {
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

  const PREF_PREF_V = {
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

  const PREF_PREF_I = {
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

  const REPORTS = [
    REF_REF_V1,
    REF_REF_V2,
    REF_REF_I,
    NAM_NAM_V,
    NAM_NAM_I,
    PREF_PREF_V,
    PREF_PREF_I
  ];

  const getListElement = (report) => {
    return element(by.css('#reports-list .unfiltered li[data-record-id="'+ report._id +'"]'));
  };

  const compareLineage = (lineageListElement, expectedLineage, links) => {
    let element = 'li';
    if (links) {
      element = 'a';
    }
    lineageListElement.all(by.css(element)).each((item, key) => {
      expect(item.getText()).toBe(expectedLineage[key]);
    });
  };

  const checkItemListSummary = (report) => {
    const listElement = getListElement(report);

    switch (report._id) {
      case REF_REF_V1._id:
      case REF_REF_V2._id:
        expect(listElement.element(by.css('.content .heading h4 span')).getText()).toBe(MARIA.name);
        expect(listElement.element(by.css('.content .summary p')).getText()).toBe('REF_REF');
        //shows subject lineage breadcrumbs
        compareLineage(listElement.element(by.css('.content .detail ol.lineage')), ['TAG Place', 'Health Center', 'District']);
        break;
      case REF_REF_I._id:
        expect(listElement.element(by.css('.content .heading h4 span')).getText()).toBe('Unknown subject');
        expect(listElement.element(by.css('.content .summary p')).getText()).toBe('REF_REF');
        //shows submitter lineage breadcrumbs
        compareLineage(listElement.element(by.css('.content .detail ol.lineage')), ['Bob Place', 'Health Center', 'District']);
        break;
      case NAM_NAM_V._id:
        expect(listElement.element(by.css('.content .heading h4 span')).getText()).toBe(GEORGE.name);
        expect(listElement.element(by.css('.content .summary p')).getText()).toBe('NAM_NAM');
        //shows submitter lineage breadcrumbs
        compareLineage(listElement.element(by.css('.content .detail ol.lineage')), ['Bob Place', 'Health Center', 'District']);
        break;
      case NAM_NAM_I._id:
        expect(listElement.element(by.css('.content .heading h4 span')).getText()).toBe('Unknown subject');
        expect(listElement.element(by.css('.content .summary p')).getText()).toBe('NAM_NAM');
        //shows submitter lineage breadcrumbs
        compareLineage(listElement.element(by.css('.content .detail ol.lineage')), ['Bob Place', 'Health Center', 'District']);
        break;
      case PREF_PREF_V._id:
        expect(listElement.element(by.css('.content .heading h4 span')).getText()).toBe(TAG_PLACE.name);
        expect(listElement.element(by.css('.content .summary p')).getText()).toBe('PID_PID');
        //shows subject lineage breadcrumbs
        compareLineage(listElement.element(by.css('.content .detail ol.lineage')), ['Health Center', 'District']);
        break;
      case PREF_PREF_I._id:
        expect(listElement.element(by.css('.content .heading h4 span')).getText()).toBe('Unknown subject');
        expect(listElement.element(by.css('.content .summary p')).getText()).toBe('PID_PID');
        //shows submitter lineage breadcrumbs
        compareLineage(listElement.element(by.css('.content .detail ol.lineage')), ['Bob Place', 'Health Center', 'District']);
        break;
    }
  };

  const checkItemContentSummary = (report) => {
    const summaryElement = element(by.css('#reports-content .item-summary'));
    browser.wait(() => summaryElement.isPresent(), 10000);

    switch (report._id) {
      case REF_REF_V1._id:
      case REF_REF_V2._id:
        expect(summaryElement.element(by.css('.subject .name')).getText()).toBe(MARIA.name);
        expect(summaryElement.element(by.css('.subject + div')).getText()).toBe('REF_REF');

        compareLineage(summaryElement.element(by.css('.position .lineage')), ['TAG Place', 'Health Center', 'District'], true);

        browser.wait(() => element(by.cssContainingText('#reports-content .item-summary .name', CAROL.name)).isPresent(), 10000);
        expect(summaryElement.element(by.css('.sender .name')).getText()).toBe(CAROL.name);
        expect(summaryElement.element(by.css('.sender .phone')).getText()).toBe(CAROL.phone);
        break;
      case REF_REF_I._id:
        expect(summaryElement.element(by.css('.subject .name')).getText()).toBe('Unknown subject');
        expect(summaryElement.element(by.css('.subject + div')).getText()).toBe('REF_REF');

        browser.wait(() => element(by.cssContainingText('#reports-content .item-summary .name', CAROL.name)).isPresent(), 10000);
        compareLineage(summaryElement.element(by.css('.position .lineage')), ['Bob Place', 'Health Center', 'District'], true);
        expect(summaryElement.element(by.css('.sender .name')).getText()).toBe(CAROL.name);
        expect(summaryElement.element(by.css('.sender .phone')).getText()).toBe(CAROL.phone);
        break;
      case NAM_NAM_V._id:
        expect(summaryElement.element(by.css('.subject .name')).getText()).toBe(GEORGE.name);
        expect(summaryElement.element(by.css('.subject + div')).getText()).toBe('NAM_NAM');

        browser.wait(() => element(by.cssContainingText('#reports-content .item-summary .name', CAROL.name)).isPresent(), 10000);
        compareLineage(summaryElement.element(by.css('.position .lineage')), ['Bob Place', 'Health Center', 'District'], true);
        expect(summaryElement.element(by.css('.sender .name')).getText()).toBe(CAROL.name);
        expect(summaryElement.element(by.css('.sender .phone')).getText()).toBe(CAROL.phone);
        break;
      case NAM_NAM_I._id:
        expect(summaryElement.element(by.css('.subject .name')).getText()).toBe('Unknown subject');
        expect(summaryElement.element(by.css('.subject + div')).getText()).toBe('NAM_NAM');

        browser.wait(() => element(by.cssContainingText('#reports-content .item-summary .name', CAROL.name)).isPresent(), 10000);
        compareLineage(summaryElement.element(by.css('.position .lineage')), ['Bob Place', 'Health Center', 'District'], true);
        expect(summaryElement.element(by.css('.sender .name')).getText()).toBe(CAROL.name);
        expect(summaryElement.element(by.css('.sender .phone')).getText()).toBe(CAROL.phone);
        break;
      case PREF_PREF_V._id:
        expect(summaryElement.element(by.css('.subject .name')).getText()).toBe(TAG_PLACE.name);
        expect(summaryElement.element(by.css('.subject + div')).getText()).toBe('PID_PID');

        compareLineage(summaryElement.element(by.css('.position .lineage')), ['Health Center', 'District'], true);

        browser.wait(() => element(by.cssContainingText('#reports-content .item-summary .name', CAROL.name)).isPresent(), 10000);
        expect(summaryElement.element(by.css('.sender .name')).getText()).toBe(CAROL.name);
        expect(summaryElement.element(by.css('.sender .phone')).getText()).toBe(CAROL.phone);
        break;
      case PREF_PREF_I._id:
        expect(summaryElement.element(by.css('.subject .name')).getText()).toBe('Unknown subject');
        expect(summaryElement.element(by.css('.subject + div')).getText()).toBe('PID_PID');

        browser.wait(() => element(by.cssContainingText('#reports-content .item-summary .name', CAROL.name)).isPresent(), 10000);
        compareLineage(summaryElement.element(by.css('.position .lineage')), ['Bob Place', 'Health Center', 'District'], true);
        expect(summaryElement.element(by.css('.sender .name')).getText()).toBe(CAROL.name);
        expect(summaryElement.element(by.css('.sender .phone')).getText()).toBe(CAROL.phone);
        break;
    }
  };

  const runTest = (report) => {
    commonElements.goToReports();

    helper.waitElementToBeClickable(element(by.css('.action-container .general-actions:not(.ng-hide) .fa-plus')));
    helper.waitElementToBeClickable(getListElement(report).element(by.css('.summary')));

    helper.clickElement(getListElement(report).element(by.css('.summary')));
    checkItemListSummary(report);
    checkItemContentSummary(report);
  };

  beforeAll(done => {
    utils.updateSettings(CONFIG)
      .then(() => protractor.promise.all(CONTACTS.map(utils.saveDoc)))
      .then(() => protractor.promise.all(REPORTS.map(utils.saveDoc)))
      .then(done)
      .catch(done.fail);
  });

  afterAll(utils.afterEach);

  describe('Displays correct LHS and RHS summary', () => {
    it('Concerning reports using patient_id', () => {
      runTest(REF_REF_V1);
    });

    it('Concerning reports using doc id', () => {
      runTest(REF_REF_V2);
    });

    it('Concerning reports with unknown patient_id', () => {
      runTest(REF_REF_I);
    });

    it('Concerning reports using patient name', () => {
      runTest(NAM_NAM_V);
    });

    it('Concerning reports using missing required patient name', () => {
      runTest(NAM_NAM_I);
    });

    it('Concerning reports using place_id', () => {
      runTest(PREF_PREF_V);
    });

    it('Concerning reports using unknown place_id', () => {
      runTest(PREF_PREF_I);
    });
  });
});
