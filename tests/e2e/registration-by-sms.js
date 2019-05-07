const utils = require('../utils'),
      commonElements = require('../page-objects/common/common.po.js'),
      helper = require('../helper'),
      moment = require('moment');

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
      },
      update_sent_forms: {
        load: './transitions/update_sent_forms.js'
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
            content: '{{#patient_name}}The registration format is incorrect, ensure the message starts with R followed by space and the mother name (maximum of 30 characters).{{/patient_name}}{{^patient_name}}The registration format is incorrect. ensure the message starts with R followed by space and the mothers name.{{/patient_name}}.',
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
    date_format: 'ddd, MMM Do, YYYY',
    locale_outgoing: 'sw'
  };

  const submit = body => {
    const content = JSON.stringify(body);
    return utils.request({
      method: 'POST',
      path: '/api/sms',
      body: content,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': content.length
      }
    });
  };

  describe('submits new sms messages', () => {
    let originalTimeout;

    beforeEach(done => {
      const body = {
        messages: [{
          from: PHONE,
          content: 'R Siobhan 12',
          id: 'a'
        }]
      };
      utils.updateSettings(CONFIG)
        .then(() => protractor.promise.all(DOCS.map(utils.saveDoc)))
        .then(() => submit(body))
        .then(() => {
          // delay by a second to allow sentinel to process the message
          setTimeout(done, 1000);
        })
        .catch(done.fail);
    });
    beforeEach(function() {
      //increasing DEFAULT_TIMEOUT_INTERVAL for this page is very slow and it takes long for the report details to load
      originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
      jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
    });

    afterEach(utils.afterEach);
    afterAll(function() {
      jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
    });

    const start = moment().startOf('day');
    start.subtract(12, 'weeks');
    const expected_date = start.clone().add(40, 'weeks');

    const checkItemSummary = () => {
      const summaryElement = element(by.css('#reports-content .item-summary'));
      expect(summaryElement.element(by.css('.sender .name')).getText()).toMatch(`Submitted by ${CAROL.name}`);
      expect(summaryElement.element(by.css('.subject .name')).getText()).toBe('Siobhan');
      expect(summaryElement.element(by.css('.sender .phone')).getText()).toBe(CAROL.phone);
      expect(summaryElement.element(by.css('.position a')).getText()).toBe(BOB_PLACE.name);
      expect(summaryElement.element(by.css('.detail')).isDisplayed()).toBeTruthy();
      expect(summaryElement.element(by.css('.detail .status')).isDisplayed()).toBe(false);
    };

    const checkAutoResponse = () => {
      const taskElement = element(by.css('#reports-content .details > ul'));
      expect(taskElement.element(by.css('.task-list > li:nth-child(1) > ul > li')).getText()).toBe('Thank you '+ CAROL.name +' for registering Siobhan');
      expect(taskElement.element(by.css('.task-list > li:nth-child(1) .task-state .state.forwarded-to-gateway')).isDisplayed()).toBeTruthy();
      expect(taskElement.element(by.css('.task-list > li:nth-child(1) .task-state .recipient')).getText()).toBe(' to +64271234567');

      expect(taskElement.element(by.css('.task-list > li:nth-child(2) > ul > li')).getText()).toBe('LMP ' + expected_date.locale('sw').format('ddd, MMM Do, YYYY'));
      expect(taskElement.element(by.css('.task-list > li:nth-child(2) .task-state .state.forwarded-to-gateway')).isDisplayed()).toBeTruthy();
      expect(taskElement.element(by.css('.task-list > li:nth-child(2) .task-state .recipient')).getText()).toBe(' to +64271234567');
    };

    const checkScheduledTask = (childIndex, title, message) => {
      const taskElement = element(by.css('#reports-content .details .scheduled-tasks > ul > li:nth-child(' + childIndex + ')'));
      expect(taskElement.element(by.css('h3')).getText()).toContain(title);
      expect(taskElement.element(by.css('.task-list li > ul > li')).getText()).toBe(message);
      expect(taskElement.element(by.css('.task-list li .task-state .state.scheduled')).isDisplayed()).toBeTruthy();
      expect(taskElement.element(by.css('.task-list li .task-state .recipient')).getText()).toBe(' to +64271234567');
    };

    it('shows content', () => {
      commonElements.goToReports(true);
      helper.waitElementToBeClickable(element(by.css('#reports-list .unfiltered li:first-child')));
      browser.wait(() => element(by.cssContainingText('#reports-list .unfiltered li:first-child h4 span', 'Siobhan')).isPresent(), 10000);
      helper.clickElement(element(by.css('#reports-list .unfiltered li:first-child .summary')));

      // wait for content to load
      browser.wait(() => element(by.cssContainingText('#reports-content .item-summary .phone', CAROL.phone)).isPresent(), 30000);

      checkItemSummary();
      checkAutoResponse();
      checkScheduledTask(1, 'ANC Reminders LMP:1', 'Visit 1 reminder for Siobhan');
      checkScheduledTask(2, 'ANC Reminders LMP:2', 'Visit 2 reminder for Siobhan');
      checkScheduledTask(3, 'ANC Reminders LMP:3', 'LMP ' + expected_date.locale('sw').format('ddd, MMM Do, YYYY'));
    });

  });
});
