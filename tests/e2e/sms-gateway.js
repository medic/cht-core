const utils = require('../utils');
const helper = require('../helper');
const smsGatewayPo = require('../page-objects/messages/sms-gateway.po');

const messageId1 = '00f237ab-dd34-44a8-9f17-caaa022be947';
const messageId2 = '40cb5078-57da-427c-b3a9-b76ae581e5da';
const messageId3 = '121a9fe4-2da0-49c1-a0cf-13f2554d7430';
const messageTo1 = '+64275555556';
const messageContent1 =
  'Thank you for registering Shannon. Their pregnancy ID is 28551, and EDD is Sun, Dec 18th, 2016';
const messageContent2 =
  'Please remind Shannon (28551) to visit the health facility for ANC visit this week. ' +
  'When she does let us know with "V 28551". Thanks!';
const messageTo2 = '+64275555556';
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
          uuid: messageId1,
        },
      ],
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
          uuid: messageId2,
        },
      ],
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
          message:
            'Did Shannon attend her ANC visit? When she does, respond with "V 28551". Thank you!',
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
          to: '+64275555556',
          message:
            'Please remind Shannon (28551) to visit the health facility for ANC visit this week. ' +
            'When she does let us know with "V 28551". Thanks!',
          uuid: messageId3,
        },
      ],
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

describe('sms-gateway api', () => {
  const pollSmsApi = body => {
    return utils.requestNative({
      method: 'POST',
      path: '/api/sms',
      body: body
    });
  };

  describe('- gateway submits new WT sms messages', () => {
    beforeEach(async () => {
      const body = {
        messages: [
          {
            from: '+64271234567',
            content: 'hello',
            id: 'a',
          },
        ],
      };
      await pollSmsApi(body);
      await helper.handleUpdateModalNative();
    });
    afterEach(async () => { await helper.handleUpdateModalNative(); });

    it('shows content', async () => {
      //LHS
      const phone = '+64271234567';
      const msg = 'hello';
      await smsGatewayPo.showMessageList();
      const messageListHeading = await helper.getTextFromElement(smsGatewayPo.messageHeading(1));
      expect(messageListHeading).toBe(phone);
      const messageListSummary = await helper.getTextFromElement(smsGatewayPo.messageSummary(1));
      expect(messageListSummary).toBe(msg);

      // RHS
      await smsGatewayPo.showMessageDetails();
      const messageHeader = await helper.getTextFromElement(smsGatewayPo.messageDetailsHeader());
      expect(messageHeader).toBe(phone);
      const messageText = await helper.getTextFromElement(smsGatewayPo.incomingData);
      expect(messageText).toBe(msg);
      const messageStatus = await helper.getTextFromElement(smsGatewayPo.messageDetailStatus());
      await expect(messageStatus).toMatch('received');
    });
  });

  describe('- gateway submits WT sms status updates', () => {
    let savedDoc;

    beforeEach(async () => {
      const result = await utils.saveDocNative(report);
      savedDoc = result.id;
      const body = {
        updates: [
          { id: messageId1, status: 'SENT' },
          { id: messageId2, status: 'DELIVERED' },
          {
            id: messageId3,
            status: 'FAILED',
            reason: 'Insufficient credit',
          },
        ]
      };
      await pollSmsApi(body);
    });

    afterEach(async () => { await utils.deleteDocNative(savedDoc); });

    it('- shows content', async () => {

      await smsGatewayPo.showReport(savedDoc);

      // tasks

      expect(await smsGatewayPo.sentTaskState()).toMatch('sent');
      const deliveredTask = smsGatewayPo.getState(1,1);
      expect(await smsGatewayPo.getTaskState(deliveredTask)).toMatch('delivered');
      const scheduledTask = smsGatewayPo.getState(1,2);
      expect(await smsGatewayPo.getTaskState(scheduledTask)).toMatch('scheduled');
      const failedTask = smsGatewayPo.getState(2,1);
      expect(await smsGatewayPo.getTaskState(failedTask)).toMatch('failed');
    });
  });

  describe('- api returns list of pending WO messages', () => {
    let savedDoc;
    let response;

    beforeEach(async () => {
      const reportWithTwoMessagesToSend = JSON.parse(JSON.stringify(report));
      // First scheduled message is in forwarded-to-gateway state.
      reportWithTwoMessagesToSend.scheduled_tasks[0].state =
        'forwarded-to-gateway';
      reportWithTwoMessagesToSend.scheduled_tasks[0].state_history.push({
        state: 'forwarded-to-gateway',
        timestamp: '2016-08-05T02:24:48.569Z',
      });

      const result = await utils.saveDocNative(reportWithTwoMessagesToSend);
      savedDoc = result.id;
      response = await pollSmsApi({});
    });

    afterEach(async () => {
      await helper.logConsoleErrors('sms-gateway');
      await utils.deleteDocNative(savedDoc);
    });

    it('- returns list and updates state', async () => {
      // TEMP: This is a flaky test, because sometimes there are more messages
      //       than the 2 that we expect there to be. Outputting so when it
      //       flakes we can see which messages they are and work out where
      //       they came from
      //  For reference, when running this locally with I got:
      // [
      //   {
      //     "content": "Thank you for registering Shannon.
      //          Their pregnancy ID is 28551, and EDD is Sun, Dec 18th, 2016",
      //     "id": "00f237ab-dd34-44a8-9f17-caaa022be947",
      //     "to": "+64275555556"
      //   },
      //   {
      //     "content": "Please remind Shannon (28551) to visit the health facility for ANC visit this week.
      //          When she does let us know with \"V 28551\". Thanks!",
      //     "id": "40cb5078-57da-427c-b3a9-b76ae581e5da",
      //     "to": "+64275555556"
      //   }
      // ]
      console.log('Messages currently present'); // eslint-disable-line no-console
      console.log(JSON.stringify(response.messages)); // eslint-disable-line no-console
      expect(response.messages.length).toBe(2);
      expect(response.messages[0].id).toBe(messageId1);
      expect(response.messages[0].to).toBe(messageTo1);
      expect(response.messages[0].content).toBe(messageContent1);
      expect(response.messages[1].id).toBe(messageId2);
      expect(response.messages[1].to).toBe(messageTo2);
      expect(response.messages[1].content).toBe(messageContent2);

      await smsGatewayPo.showReport(savedDoc);

      // tasks
      expect(await smsGatewayPo.feedbackState()).toMatch('forwarded');
      // scheduled tasks
      // State for messageId2 is still forwarded-to-gateway
      const messageState = smsGatewayPo.getState(1,1);
      expect(await smsGatewayPo.getTaskState(messageState)).toMatch('forwarded');
    });
  });
});
