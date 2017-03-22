const utils = require('../utils');

describe('registration transition', () => {

  'use strict';

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
    parent: BOB_PLACE,
    patient_id: '05946',
    sex: 'f',
    date_of_birth: 1462333250374
  };

  const DOCS = [ BOB_PLACE, CAROL ];
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
            length: [ 1, 30 ],
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
            length: [ 1, 2 ],
            range: [ 0, 40 ],
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
        }
      ]
    }]
  };
  const savedUuids = [];

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

  // refresh after changing settings so the new settings are loaded
  const refresh = () => {
    browser.driver.navigate().refresh();
    return browser.wait(() => browser.isElementPresent(by.id('reports-tab')), 10000);
  };

  describe('submits new sms messages', () => {

    beforeEach(done => {
      browser.ignoreSynchronization = true;
      const body = {
        messages: [{
          from: PHONE,
          content: 'R Siobhan 12',
          id: 'a'
        }]
      };
      utils.updateSettings(CONFIG)
        .then(() => protractor.promise.all(DOCS.map(utils.saveDoc)))
        .then(results => results.forEach(result => savedUuids.push(result.id)))
        .then(() => submit(body))
        .then(() => refresh)
        .then(done)
        .catch(done);
    });

    afterEach(done => {
      utils.revertSettings()
        .then(() => protractor.promise.all(savedUuids.map(utils.deleteDoc)))
        .then(refresh)
        .then(done)
        .catch(done);
    });

    const checkItemSummary = () => {
      const summaryElement = element(by.css('#reports-content .item-summary'));
      expect(summaryElement.element(by.css('.name')).getText()).toBe(CAROL.name);
      expect(summaryElement.element(by.css('.phone')).getText()).toBe(CAROL.phone);
      expect(summaryElement.element(by.css('.position a')).getText()).toBe(BOB_PLACE.name);
      expect(summaryElement.element(by.css('.detail > div:last-child')).getText()).toBe(FORM_NAME);
      expect(summaryElement.element(by.css('.detail .status .fa-circle.green-dot')).isDisplayed()).toBeTruthy();
    };

    const checkAutoResponse = () => {
      const taskElement = element(by.css('#reports-content .details > ul'));
      expect(taskElement.element(by.css('.task-list > li > ul > li')).getText()).toBe('Thank you for registering Siobhan');
      expect(taskElement.element(by.css('.task-list .task-state .state.pending')).isDisplayed()).toBeTruthy();
      expect(taskElement.element(by.css('.task-list .task-state .recipient')).getText()).toBe(' to +64271234567');
    };

    const checkScheduledTask = (childIndex, title, message) => {
      const taskElement = element(by.css('#reports-content .details .scheduled-tasks > ul > li:nth-child(' + childIndex + ')'));
      expect(taskElement.element(by.css('p')).getText()).toContain(title);
      expect(taskElement.element(by.css('.task-list li > ul > li')).getText()).toBe(message);
      expect(taskElement.element(by.css('.task-list li .task-state .state.scheduled')).isDisplayed()).toBeTruthy();
      expect(taskElement.element(by.css('.task-list li .task-state .recipient')).getText()).toBe(' to +64271234567');
    };

    it('shows content', () => {
      browser.driver.navigate().refresh();
      browser.wait(() => browser.isElementPresent(by.id('reports-tab')), 10000);
      element(by.id('reports-tab')).click();

      // refresh - live list only updates on changes but changes are disabled for e2e
      browser.driver.navigate().refresh();

      // wait for sentinel to do its thing
      browser.wait(() => browser.isElementPresent(by.cssContainingText('#reports-list .unfiltered li:first-child .name', CAROL.name)), 10000);

      element(by.css('#reports-list .unfiltered li:first-child .item-summary')).click();

      // wait for content to load
      browser.wait(() => browser.isElementPresent(by.cssContainingText('#reports-content .item-summary .name', CAROL.name)), 10000);

      checkItemSummary();
      checkAutoResponse();
      checkScheduledTask(1, 'ANC Reminders LMP:1', 'Visit 1 reminder for Siobhan');
      checkScheduledTask(2, 'ANC Reminders LMP:2', 'Visit 2 reminder for Siobhan');
    });

  });
});
