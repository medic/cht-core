const utils = require('../../utils');
const messagesPo = require('../../page-objects/messages/messages.wdio.page');
const reportsPo = require('../../page-objects/reports/reports.wdio.page');
const commonElements = require('../../page-objects/common/common.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const smsPregancy = require('../../factories/cht/reports/sms-pregnancy');

describe('sms-gateway api', () => {
  before(async ()=> {
    await loginPage.cookieLogin();
  });

  const pollSmsApi = body => {
    return utils.request({
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
    });

    it('shows content', async () => {
      //LHS
      const phone = '+64271234567';
      const msg = 'hello';
      await commonElements.goToMessages();
      await messagesPo.waitForMessagesInLHS();
      const message = await messagesPo.messageByIndex(1);
      await expect(await messagesPo.listMessageHeading(message)).toHaveText(phone);
      await expect(await messagesPo.listMessageSummary(message)).toHaveText(msg);

      // RHS
      const id = await (await messagesPo.messageByIndex(1)).getAttribute('test-id');
      await messagesPo.clickLhsEntry(id);
      await expect(await messagesPo.messageDetailsHeader()).toHaveText(phone);
      const msgContent = await messagesPo.messageContentText(await messagesPo.messageContentIndex());
      await expect(msgContent).toHaveText(msg);
      const messageStatus = await (await messagesPo.messageDetailStatus()).getText();
      await expect(messageStatus).toMatch('received');
    });
  });

  describe('- gateway submits WT sms status updates', () => {
    let savedDoc;

    beforeEach(async () => {
      const report = smsPregancy.pregnancy().build();
      const result = await utils.saveDoc(report);
      savedDoc = result.id;
      const body = {
        updates: [
          { id: report.tasks[0].messages[0].uuid, status: 'SENT' },
          { id: report.scheduled_tasks[0].messages[0].uuid, status: 'DELIVERED' },
          {
            id: report.scheduled_tasks[2].messages[0].uuid,
            status: 'FAILED',
            reason: 'Insufficient credit',
          },
        ]
      };
      await pollSmsApi(body);
    });

    afterEach(async () => { await utils.deleteDoc(savedDoc); });

    it('- shows content', async () => {

      await reportsPo.goToReportById(savedDoc);

      // tasks

      const sentTask = await (await reportsPo.sentTask()).getText();
      const deliveredTask = await (await reportsPo.getTaskState(1, 1)).getText();
      const scheduledTask = await (await reportsPo.getTaskState(1, 2)).getText();
      const failedTask = await (await reportsPo.getTaskState(2, 1)).getText();
      expect(sentTask).toMatch('sent');
      expect(deliveredTask).toMatch('delivered');
      expect(scheduledTask).toMatch('scheduled');
      expect(failedTask).toMatch('failed');
    });
  });

  describe('- api returns list of pending WO messages', () => {
    let savedDoc;
    let response;
    let reportWithTwoMessagesToSend;

    beforeEach(async () => {
      reportWithTwoMessagesToSend = smsPregancy.pregnancy().build();
      // First scheduled message is in forwarded-to-gateway state.
      reportWithTwoMessagesToSend.scheduled_tasks[0].state =
        'forwarded-to-gateway';
      reportWithTwoMessagesToSend.scheduled_tasks[0].state_history.push({
        state: 'forwarded-to-gateway',
        timestamp: '2016-08-05T02:24:48.569Z',
      });

      const result = await utils.saveDoc(reportWithTwoMessagesToSend);
      savedDoc = result.id;
      response = await pollSmsApi({});
      console.log(response);
    });

    afterEach(async () => {
      await utils.deleteDoc(savedDoc);
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
      expect(response.messages[0].id).toBe(reportWithTwoMessagesToSend.scheduled_tasks[0].messages[0].uuid);
      expect(response.messages[0].to).toBe(reportWithTwoMessagesToSend.scheduled_tasks[0].messages[0].to);
      expect(response.messages[0].content).toBe(reportWithTwoMessagesToSend.scheduled_tasks[0].messages[0].message);
      expect(response.messages[1].id).toBe(reportWithTwoMessagesToSend.tasks[0].messages[0].uuid);
      expect(response.messages[1].to).toBe(reportWithTwoMessagesToSend.tasks[0].messages[0].to);
      expect(response.messages[1].content).toBe(reportWithTwoMessagesToSend.tasks[0].messages[0].message);

      await reportsPo.goToReportById(savedDoc);

      // tasks
      const forwardedMessage = await (await reportsPo.sentTask()).getText();
      expect(forwardedMessage).toMatch('forwarded');
      // scheduled tasks
      // State for messageId2 is still forwarded-to-gateway
      const messageState = await (await reportsPo.getTaskState(1, 1)).getText();
      expect(messageState).toMatch('forwarded');
    });
  });
});
