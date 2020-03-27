const utils = require('../utils');
const constants = require('../constants');
const commonElements = require('../page-objects/common/common.po.js');
const helper = require('../helper');
const querystring = require('querystring');

const messageGatewayRef1 = 'f0f237ab-dd34-44a8-9f17-caaa022be947';
const messageGatewayRef2 = 'f0cb5078-57da-427c-b3a9-b76ae581e5da';
const messageGatewayRef3 = 'f21a9fe4-2da0-49c1-a0cf-13f2554d7430';
const messageTo1 = '+64275555556';
const messageTo2 = '+64275555557';
const messageTo3 = '+64275555558';
const messageContent1 = 'Thank you for registering Shannon. Their pregnancy ID is 28551, and EDD is ' +
  'Sun, Dec 18th, 2016';
const messageContent2 = 'Please remind Shannon (28551) to visit the health facility for ANC visit this week. ' +
  'When she does let us know with "V 28551". Thanks!';

const INCOMING_KEY = 'yabbadabbadoo';

const report = {
  type: 'data_record',
  from: '+64275555556',
  form: 'P',
  errors: [],
  tasks: [
    {
      messages: [
        {
          to: messageTo1,
          message: messageContent1,
          uuid: 'a',
        }
      ],
      gateway_ref: messageGatewayRef1,
      state: 'pending',
      state_history: [
        {
          state: 'pending',
          timestamp: '2016-08-04T02:24:48.578Z',
        },
      ],
    },
  ],
  fields: {
    last_menstrual_period: 20,
    patient_name: 'Shannon',
  },
  reported_date: 1470277478632,
  sms_message: {
    message_id: '4490',
    sent_timestamp: '1470277478632',
    message: '1!P!20#Shannon',
    from: '+64275555556',
    type: 'sms_message',
    form: 'P',
    locale: 'en',
  },
  read: [],
  patient_id: '28551',
  lmp_date: '2016-03-12T11:00:00.000Z',
  expected_date: '2016-12-17T11:00:00.000Z',
  scheduled_tasks: [
    {
      due: '2016-08-28T21:00:00.000Z',
      messages: [
        {
          to: messageTo2,
          message: messageContent2,
          uuid: 'b',
        },
      ],
      gateway_ref: messageGatewayRef2,
      state: 'scheduled',
      state_history: [
        {
          state: 'scheduled',
          timestamp: '2016-08-04T02:24:48.569Z',
        },
      ],
      group: 2,
      type: 'ANC Reminders LMP',
    },
    {
      due: '2016-09-04T22:00:00.000Z',
      messages: [
        {
          to: '+64275555556',
          message: 'Did Shannon attend her ANC visit? When she does, respond with "V 28551". Thank you!',
          uuid: '2ca2e79b-4971-4619-bd8b-7324d30bc060',
        },
      ],
      state: 'scheduled',
      state_history: [
        {
          state: 'scheduled',
          timestamp: '2016-08-04T02:24:48.570Z',
        },
      ],
      group: 2,
      type: 'ANC Reminders LMP',
    },
    {
      due: '2016-10-23T20:00:00.000Z',
      messages: [
        {
          to: messageTo3,
          message: 'Please remind Shannon (28551) to visit the health facility for ANC visit this week. ' +
            'When she does let us know with "V 28551". Thanks!',
          uuid: 'c',
        },
      ],
      gateway_ref: messageGatewayRef3,
      state: 'scheduled',
      state_history: [
        {
          state: 'scheduled',
          timestamp: '2016-08-04T02:24:48.570Z',
        },
      ],
      group: 3,
      type: 'ANC Reminders LMP',
    },
  ],
  contact: {
    _id: 'c49385b3594af7025ef097114104dd97',
    _rev: '1-6f271bce3935ae5a336bdfc15edf313a',
    name: 'John',
    date_of_birth: '',
    phone: '+64275555556',
    alternate_phone: '',
    notes: '',
    type: 'person',
    reported_date: 1469578114398,
  },
};

describe('africas talking api', () => {

  beforeAll(() => {
    return utils.request({
      port: constants.COUCH_PORT,
      method: 'PUT',
      path: `/_node/${constants.COUCH_NODE_NAME}/_config/medic-credentials/africastalking.com:incoming`,
      body: `${INCOMING_KEY}`
    });
  });

  describe('- gateway submits new WT sms messages', () => {
    const submitSms = body => {
      const content = querystring.stringify(body);
      return utils.request({
        method: 'POST',
        path: `/api/v1/sms/africastalking/incoming-messages?key=${INCOMING_KEY}`,
        body: content,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': content.length,
        },
        json: false,
      });
    };

    beforeEach(done => {
      submitSms({ from: '+64271234567', text: 'hello', id: 'a' })
        .then(done)
        .catch(done.fail);
    });

    it('- shows content', () => {
      commonElements.goToTasks();
      commonElements.goToMessages();

      // LHS
      helper.waitElementToBeVisible(element(by.css('#message-list li:first-child')));
      const heading = element(by.css('#message-list li:first-child .heading h4'));
      const summary = element(by.css('#message-list li:first-child .summary p'));
      expect(helper.getTextFromElement(heading)).toBe('+64271234567');
      expect(helper.getTextFromElement(summary)).toBe('hello');
      helper.clickElement(summary);

      // RHS
      helper.waitElementToBeVisible(element(by.css('#message-content li.incoming:first-child .data p:first-child')));
      const messageHeader = element(by.css('#message-header .name'));
      const messageText = element(by.css('#message-content li.incoming:first-child .data p:first-child'));
      const messageStatus = element(by.css('#message-content li.incoming:first-child .data .state.received'));
      expect(helper.getTextFromElement(messageHeader)).toBe('+64271234567');
      expect(helper.getTextFromElement(messageText)).toBe('hello');
      expect(helper.getTextFromElement(messageStatus)).toBe('received');

      // database
      return element(by.css('#message-content li.incoming:first-child')).getAttribute('data-record-id').then(id => {
        return utils.getDoc(id).then(doc => {
          expect(doc.sms_message && doc.sms_message.gateway_ref).toBe('a');
        });
      });
    });
  });

  describe('- gateway submits WT sms status updates', () => {
    let savedDoc;

    const submitDeliveryReport = body => {
      const content = querystring.stringify(body);
      return utils.request({
        method: 'POST',
        path: `/api/v1/sms/africastalking/delivery-reports?key=${INCOMING_KEY}`,
        body: content,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': content.length,
        },
        json: false,
      });
    };

    beforeEach(done => {
      utils.saveDoc(report)
        .then(result => {
          savedDoc = result.id;
          return Promise.all([
            submitDeliveryReport({ id: messageGatewayRef1, status: 'Submitted', phoneNumber: messageTo1 }),
            submitDeliveryReport({ id: messageGatewayRef2, status: 'Success', phoneNumber: messageTo2 }),
            submitDeliveryReport({ id: messageGatewayRef3, status: 'Failed',
              failureReason: 'InsufficientCredit', phoneNumber: messageTo3 }),
          ]);
        })
        .then(done)
        .catch(done.fail);
    });

    afterEach(done => {
      utils.deleteDoc(savedDoc)
        .then(done)
        .catch(done.fail);
    });

    it('- shows content', () => {
      commonElements.goToReports();
      helper.waitUntilReady(element(by.css('#reports-list li:first-child')));
      helper.clickElement(element(by.css('#reports-list li:first-child .heading')));
      helper.waitElementToPresent(element(by.css('#reports-content .body .item-summary .icon')));
      helper.waitForAngularComplete();

      // tasks
      const sentTaskState = element(by.css('#reports-content .details > ul .task-list .task-state .state'));
      const deliveredTaskState = element(by.css(
        '#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(1) .task-state .state')
      );
      const scheduledTaskState = element(by.css(
        '#reports-content .scheduled-tasks > ul > li:nth-child(1) > ul > li:nth-child(2) .task-state .state')
      );
      const failedTaskState = element(by.css(
        '#reports-content .scheduled-tasks > ul > li:nth-child(2) > ul > li:nth-child(1) .task-state .state')
      );

      expect(helper.getTextFromElement(sentTaskState)).toBe('sent');
      expect(helper.getTextFromElement(deliveredTaskState)).toBe('delivered');
      expect(helper.getTextFromElement(scheduledTaskState)).toBe('scheduled');
      expect(helper.getTextFromElement(failedTaskState)).toBe('failed');
    });
  });

});
