const utils = require('../../../utils');
const sUtils = require('../../../utils/sentinel');
const commonElements = require('../../../page-objects/common/common.po.js');
const helper = require('../../../helper');
const moment = require('moment');
const reportsPo = require('../../../page-objects/reports/reports.po');
const dateFormatString = 'ddd, MMM Do, YYYY';

const computeExpectedDate = async () => {
  const reportedDateOptions = await reportsPo.relativeDate().getAttribute('data-date-options');
  const reportedDate = JSON.parse(reportedDateOptions);
  const start = moment(reportedDate.date).startOf('day').subtract(12, 'weeks');
  const expectedDate = start.add(40, 'weeks');

  return expectedDate;
};

describe('registration transition', () => {
  const PHONE = '+64271234567';
  const FORM_NAME = 'Registration';

  // contacts
  const BOB_PLACE = {
    _id: 'bob-contact',
    reported_date: 1,
    type: 'clinic',
    name: 'Bob Place'
  };
  const CAROL = {
    _id: 'carol-contact',
    reported_date: 1,
    type: 'person',
    phone: PHONE,
    name: 'Carol Carolina',
    parent: { _id: BOB_PLACE._id },
    patient_id: '05946',
    sex: 'f',
    date_of_birth: 1462333250374
  };

  const DOCS = [BOB_PLACE, CAROL];
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
          code: 'R',
          label: {
            en: FORM_NAME
          }
        },
        fields: {
          patient_name: {
            labels: {
              tiny: {
                en: 'N'
              },
              description: {
                en: 'Patient Name'
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
          last_menstrual_period: {
            labels: {
              tiny: {
                en: 'LMP'
              },
              description: {
                en: 'Weeks since last menstrual period'
              },
              short: {
                en: 'Weeks since LMP'
              }
            },
            position: 1,
            type: 'integer',
            length: [1, 2],
            range: [0, 40],
            required: true,
            validations: {},
            flags: {}
          }
        },
        public_form: true,
        use_sentinel: true
      }
    },
    registrations: [{
      form: 'R',
      events: [
        {
          name: 'on_create',
          trigger: 'add_patient',
          params: '',
          bool_expr: ''
        },
        {
          name: 'on_create',
          trigger: 'add_expected_date',
          params: 'lmp_date',
          bool_expr: 'doc.fields.last_menstrual_period'
        },
        {
          name: 'on_create',
          trigger: 'assign_schedule',
          params: 'ANC Reminders LMP',
          bool_expr: 'doc.fields.last_menstrual_period'
        }
      ],
      validations: {
        join_responses: false,
        list: [{
          property: 'patient_name',
          rule: 'lenMin(1) && lenMax(30)',
          message: [{
            content: '{{#patient_name}}The registration format is incorrect, ensure the message starts with R ' +
              'followed by space and the mother name (maximum of 30 characters).{{/patient_name}}{{^patient_name}}' +
              'The registration format is incorrect. ensure the message starts with R followed by space and the ' +
              'mothers name.{{/patient_name}}.',
            locale: 'en'
          }]
        }]
      },
      messages: [{
        message: [{
          content: 'Thank you {{contact.name}} for registering {{patient_name}}',
          locale: 'en'
        }],
        recipient: 'reporting_unit'
      },
      {
        message: [{
          content: 'LMP {{#date}}{{expected_date}}{{/date}}',
          locale: 'en'
        }],
        recipient: 'reporting_unit'
      }]
    }],
    schedules: [{
      name: 'ANC Reminders LMP',
      summary: '',
      description: '',
      start_from: 'lmp_date',
      messages: [
        {
          message: [{
            content: 'Visit 1 reminder for {{patient_name}}',
            locale: 'en'
          }],
          group: 1,
          offset: '15 weeks',
          send_day: 'monday',
          send_time: '09:00',
          recipient: 'reporting_unit'
        },
        {
          message: [{
            content: 'Visit 2 reminder for {{patient_name}}',
            locale: 'en'
          }],
          group: 2,
          offset: '20 weeks',
          send_day: 'monday',
          send_time: '09:00',
          recipient: 'reporting_unit'
        },
        {
          message: [{
            content: 'LMP {{#date}}{{expected_date}}{{/date}}',
            locale: 'en'
          }],
          group: 3,
          offset: '20 weeks',
          send_day: 'monday',
          send_time: '09:00',
          recipient: 'reporting_unit'
        }
      ]
    }],
    date_format: dateFormatString,
    locale_outgoing: 'sw'
  };

  const submit = body => {
    return utils.request({
      method: 'POST',
      path: '/api/sms',
      body: body
    });
  };

  describe('submits new sms messages', () => {
    let originalTimeout;

    beforeEach(async () => {
      const body = {
        messages: [{
          from: PHONE,
          content: 'R Siobhan 12',
          id: 'a'
        }]
      };
      await utils.updateSettings(CONFIG);
      await utils.saveDocs(DOCS);
      await submit(body);
      await sUtils.waitForSentinel();
    });

    beforeEach(() => {
      //increasing DEFAULT_TIMEOUT_INTERVAL for this page is very slow and it takes long for the report details to load
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
    });

    afterEach(() => utils.afterEach());
    afterAll(() => {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });

    const checkItemSummary = async () => {
      expect(await reportsPo.submitterName().getText()).toMatch(`Submitted by ${CAROL.name}`);
      expect(await reportsPo.subjectName().getText()).toBe('Siobhan');
      expect(await reportsPo.submitterPhone().getText()).toBe(CAROL.phone);
      expect(await reportsPo.submitterPlace().getText()).toBe(BOB_PLACE.name);
      expect(await reportsPo.detail().isDisplayed()).toBeTruthy();
      expect(await reportsPo.detailStatus().isPresent()).toBeFalsy();
    };

    const checkAutoResponse = async (expectedDate) => {
      expect(await reportsPo.taskTextByIndex(1)).toBe('Thank you '+ CAROL.name +' for registering Siobhan');
      expect(await reportsPo.taskGatewayStatusByIndex(1).isDisplayed()).toBeTruthy();
      expect(await reportsPo.taskRecipientByIndex(1).getText()).toBe(' to +64271234567');

      expect(await reportsPo.taskTextByIndex(2)).toBe(`LMP ${expectedDate.locale('sw').format(dateFormatString)}`);
      expect(await reportsPo.taskGatewayStatusByIndex(2).isDisplayed()).toBeTruthy();
      expect(await reportsPo.taskRecipientByIndex(2).getText()).toBe(' to +64271234567');
    };

    const checkScheduledTask = async (childIndex, title, message) => {
      expect(await reportsPo.scheduledTaskGroupByIndex(childIndex).element(by.css('h3')).getText()).toContain(title);
      expect(await reportsPo.scheduledTaskMessageByIndex(childIndex).getText()).toBe(message);
      expect(await reportsPo.scheduledTaskStateByIndex(childIndex).getText()).toBe('scheduled');
      expect(await reportsPo.scheduledTaskRecipientByIndex(childIndex).getText()).toBe(' to +64271234567');
    };

    it('shows content', async () => {
      await commonElements.goToReportsNative();
      const firstReport = reportsPo.firstReport();
      await helper.waitElementToBeClickable(firstReport);
      await browser.wait(() => element(
        by.cssContainingText(reportsPo.subject(firstReport).locator().value, 'Siobhan')
      ).isPresent(), 10000);
      await helper.clickElementNative(reportsPo.formName(firstReport));

      // wait for content to load
      await browser.wait(() => element(
        by.cssContainingText('#reports-content .item-summary .phone', CAROL.phone)
      ).isPresent(), 30000);

      const expectedDate = await computeExpectedDate();

      await checkItemSummary();
      await checkAutoResponse(expectedDate);
      await checkScheduledTask(1, 'ANC Reminders LMP:1', 'Visit 1 reminder for Siobhan');
      await checkScheduledTask(2, 'ANC Reminders LMP:2', 'Visit 2 reminder for Siobhan');
      await checkScheduledTask(3, 'ANC Reminders LMP:3', `LMP ${expectedDate.locale('sw').format(dateFormatString)}`);
    });

  });
});
