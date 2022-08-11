const utils = require('../../utils');
const messagesPo = require('../../page-objects/messages/messages.wdio.page');
const reportsPo = require('../../page-objects/reports/reports.wdio.page');
const commonElements = require('../../page-objects/common/common.wdio.page');
const loginPage = require('../../page-objects/login/login.wdio.page');
const smsPregancy = require('../../factories/cht/reports/sms-pregnancy');

const pollSmsApi = body => {
  return utils.request({
    method: 'POST',
    path: '/api/sms',
    body: body
  });
};

describe('sms-gateway api', () => {
  before(async () => {
    await loginPage.cookieLogin();
  });

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
      const heading = await (await messagesPo.listMessageHeading(message)).getText();
      const listSummary = await(await messagesPo.listMessageSummary(message)).getText();
      await expect(heading).to.equal(phone);
      await expect(listSummary).to.equal(msg);

      // RHS
      const id = await (await messagesPo.messageByIndex(1)).getAttribute('test-id');
      await messagesPo.clickLhsEntry(id);
      const headerDetail = await(await messagesPo.messageDetailsHeader()).getText();
      const msgContent = await (await messagesPo.messageContentText(await messagesPo.messageContentIndex())).getText();
      const messageStatus = await (await messagesPo.messageDetailStatus()).getText();
      await expect(headerDetail).to.equal(phone);
      await expect(msgContent).to.equal(msg);
      await expect(messageStatus).to.equal('received');
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

    it('- shows content', async () => {

      await reportsPo.goToReportById(savedDoc);

      // tasks

      const sentTask = await (await reportsPo.sentTask()).getText();
      const deliveredTask = await (await reportsPo.getTaskState(1, 1)).getText();
      const scheduledTask = await (await reportsPo.getTaskState(1, 2)).getText();
      const failedTask = await (await reportsPo.getTaskState(2, 1)).getText();
      expect(sentTask).to.contain('sent');
      expect(deliveredTask).to.contain('delivered');
      expect(scheduledTask).to.contain('scheduled');
      expect(failedTask).to.contain('failed');
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
    });

    it('- returns list and updates state', async () => {
      const scheduledTaskMessage = reportWithTwoMessagesToSend.scheduled_tasks[0].messages[0];
      const taskMessage = reportWithTwoMessagesToSend.tasks[0].messages[0];
      expect(response.messages.length).to.equal(2);
      expect(response.messages[0].id).to.equal(scheduledTaskMessage.uuid);
      expect(response.messages[0].to).to.equal(scheduledTaskMessage.to);
      expect(response.messages[0].content).to.equal(scheduledTaskMessage.message);
      expect(response.messages[1].id).to.equal(taskMessage.uuid);
      expect(response.messages[1].to).to.equal(taskMessage.to);
      expect(response.messages[1].content).to.equal(taskMessage.message);

      await reportsPo.goToReportById(savedDoc);

      // tasks
      const forwardedMessage = await (await reportsPo.sentTask()).getText();
      expect(forwardedMessage).to.equal('forwarded to gateway');
      // scheduled tasks
      // State for messageId2 is still forwarded-to-gateway
      const messageState = await (await reportsPo.getTaskState(1, 1)).getText();
      expect(messageState).to.equal('forwarded to gateway');
    });
  });
});
