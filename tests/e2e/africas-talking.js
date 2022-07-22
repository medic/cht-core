const utils = require('../utils');
const commonElements = require('../page-objects/common/common.po.js');
const messagesElements = require('../page-objects/messages/messages.po');
const reportsElements = require('../page-objects/reports/reports.po');
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

const CREDENTIAL_PASS = 'yabbadabbadoo';
const CREDENTIAL_KEY = 'africastalking.com:incoming';

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

  beforeAll(() => utils.saveCredentials(CREDENTIAL_KEY, CREDENTIAL_PASS));

  describe('- gateway submits new WT sms messages', () => {
    const submitSms = body => {
      const content = querystring.stringify(body);
      return utils.request({
        method: 'POST',
        path: `/api/v1/sms/africastalking/incoming-messages?key=${CREDENTIAL_PASS}`,
        body: content,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': content.length,
        },
        json: false,
      });
    };

    beforeEach(() => submitSms({ from: '+64271234567', text: 'hello', id: 'a' }));

    it('- shows content', async () => {
      await commonElements.goToTasks();
      await commonElements.goToMessagesNative();

      // LHS
      const firstMessage = messagesElements.messageByIndex(1);
      await helper.waitElementToBeVisibleNative(firstMessage);

      const heading = messagesElements.listMessageHeading(firstMessage);
      const summary = messagesElements.listMessageSummary(firstMessage);
      expect(await helper.getTextFromElementNative(heading)).toBe('+64271234567');
      expect(await helper.getTextFromElementNative(summary)).toBe('hello');
      await helper.clickElementNative(summary);

      // RHS

      const firstMessageContent = messagesElements.messageContentIndex(1);
      await helper.waitElementToBeVisibleNative(firstMessageContent);

      const messageHeader = messagesElements.messageDetailsHeader();
      const messageText = messagesElements.messageContentText(firstMessageContent);
      const messageStatus = messagesElements.messageContentState(firstMessageContent);

      expect(await helper.getTextFromElementNative(messageHeader)).toBe('+64271234567');
      expect(await helper.getTextFromElementNative(messageText)).toBe('hello');
      expect(await helper.getTextFromElementNative(messageStatus)).toBe('received');

      // database
      const id = await firstMessageContent.getAttribute('data-id');
      const doc = await utils.getDoc(id);
      expect(doc.sms_message && doc.sms_message.gateway_ref).toBe('a');
    });
  });

  describe('- gateway submits WT sms status updates', () => {
    let savedDoc;

    const submitDeliveryReport = body => {
      const content = querystring.stringify(body);
      return utils.request({
        method: 'POST',
        path: `/api/v1/sms/africastalking/delivery-reports?key=${CREDENTIAL_PASS}`,
        body: content,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': content.length,
        },
        json: false,
      });
    };

    beforeEach(() => {
      return utils
        .saveDoc(report)
        .then(result => {
          savedDoc = result.id;
          return Promise.all([
            submitDeliveryReport({ id: messageGatewayRef1, status: 'Submitted', phoneNumber: messageTo1 }),
            submitDeliveryReport({ id: messageGatewayRef2, status: 'Success', phoneNumber: messageTo2 }),
            submitDeliveryReport({ id: messageGatewayRef3, status: 'Failed',
              failureReason: 'InsufficientCredit', phoneNumber: messageTo3 }),
          ]);
        });
    });

    afterEach(() => utils.deleteDoc(savedDoc));

    it('- shows content', async () => {
      await commonElements.goToReportsNative();
      const firstReport = reportsElements.firstReport();

      await helper.waitUntilReadyNative(firstReport);
      const uuid = await firstReport.getAttribute('data-record-id');
      await reportsElements.loadReport(uuid);

      // tasks
      const sentTaskState = reportsElements.taskStateByIndex(1);

      const deliveredTaskState = reportsElements.scheduledTaskStateByIndex(1, 1);
      const scheduledTaskState = reportsElements.scheduledTaskStateByIndex(1, 2);
      const failedTaskState = reportsElements.scheduledTaskStateByIndex(2, 1);

      expect(await helper.getTextFromElementNative(sentTaskState)).toBe('sent');
      expect(await helper.getTextFromElementNative(deliveredTaskState)).toBe('delivered');
      expect(await helper.getTextFromElementNative(scheduledTaskState)).toBe('scheduled');
      expect(await helper.getTextFromElementNative(failedTaskState)).toBe('failed');
    });
  });

});
