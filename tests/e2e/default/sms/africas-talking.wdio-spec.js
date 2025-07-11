const utils = require('@utils');
const querystring = require('querystring');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const loginPage = require('@page-objects//default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const smsPregnancy = require('@factories/cht/reports/sms-pregnancy');
const pregnancyReportFactory = require('@factories/cht/reports/sms-pregnancy');

describe('Africas Talking api', () => {
  const CREDENTIAL_PASS_INCOMING = 'yabbadabbadoo';
  const CREDENTIAL_KEY_INCOMING = 'africastalking.com:incoming';

  const CREDENTIAL_PASS_OUTGOING = process.env.AFRICAS_TALKING_SANDBOX_API_KEY;
  const CREDENTIAL_KEY_OUTGOING = 'africastalking.com:outgoing';

  before( async () => {
    await utils.saveCredentials(CREDENTIAL_KEY_INCOMING, CREDENTIAL_PASS_INCOMING);
    CREDENTIAL_PASS_OUTGOING && await utils.saveCredentials(CREDENTIAL_KEY_OUTGOING, CREDENTIAL_PASS_OUTGOING);
    const smsSettings = {
      outgoing_service: 'africas-talking',
      reply_to: 'MEDIC',
      africas_talking: {
        username: 'sandbox',
        from: 'MEDIC'
      }
    };
    await utils.updateSettings({ sms: smsSettings }, { ignoreReload: true });
    await loginPage.cookieLogin();
  } );

  describe('Gateway submits new WT sms messages', () => {
    const submitSms = body => {
      const content = querystring.stringify(body);
      return utils.request({
        method: 'POST',
        path: `/api/v1/sms/africastalking/incoming-messages?key=${CREDENTIAL_PASS_INCOMING}`,
        body: content,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': content.length,
        },
        json: false,
      });
    };

    it('should shows content', async () => {
      const sms = { from: '+64271234567', text: 'Hello', id: 'messageID' };
      await submitSms(sms);

      await commonPage.goToMessages();
      const { heading, summary } = await messagesPage.getMessageInListDetails(sms.from);
      expect(heading).to.equal(sms.from);
      expect(summary).to.equal(sms.text);

      await messagesPage.openMessage(sms.from);
      const { name } = await messagesPage.getMessageHeader();
      expect(name).to.equal(sms.from);

      const { content, state, dataId } = await messagesPage.getMessageContent(1);
      expect(content).to.equal(sms.text);
      expect(state).to.equal('received');

      const doc = await utils.getDoc(dataId);
      expect(doc.sms_message.gateway_ref).to.equal('messageID');
    });

  });

  describe('Gateway submits WT sms status updates', () => {
    let savedDoc;
    let testReport;

    const submitDeliveryReport = body => {
      const content = querystring.stringify(body);
      return utils.request({
        method: 'POST',
        path: `/api/v1/sms/africastalking/delivery-reports?key=${CREDENTIAL_PASS_INCOMING}`,
        body: content,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': content.length,
        },
        json: false,
      });
    };

    beforeEach(async () => {
      testReport = smsPregnancy.pregnancy().build();
      const { id } = await utils.saveDoc(testReport);
      savedDoc = id;

      await submitDeliveryReport({ id: testReport.tasks[0].gateway_ref, status: 'Submitted' });
      await submitDeliveryReport({ id: testReport.scheduled_tasks[0].gateway_ref, status: 'Success' });
      await submitDeliveryReport({
        id: testReport.scheduled_tasks[2].gateway_ref,
        status: 'Failed',
        failureReason: 'InsufficientCredit'
      });
    });

    afterEach(() => utils.deleteDoc(savedDoc));

    it('should shows content', async () => {
      await commonPage.goToReports();
      const firstReport = await reportsPage.leftPanelSelectors.firstReport();
      const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

      expect(firstReportInfo.heading).to.equal('Shannon');
      expect(firstReportInfo.form).to.equal('P');

      await reportsPage.openSelectedReport(firstReport);
      await commonPage.waitForPageLoaded();

      const automaticReply = await reportsPage.getAutomaticReply();
      expect(automaticReply.message).to.include(testReport.tasks[0].messages[0].message);
      expect(automaticReply.recipient).to.include(testReport.tasks[0].messages[0].to);

      expect(await reportsPage.rightPanelSelectors.reportTasks().isDisplayed()).to.be.true;

      const deliveredTask = await reportsPage.getTaskDetails(1, 1);
      expect(deliveredTask.message).to.contain(testReport.scheduled_tasks[0].messages[0].message);
      expect(deliveredTask.recipient).to.contain(testReport.scheduled_tasks[0].messages[0].to);
      expect(deliveredTask.state).to.contain('delivered');

      const scheduledTask = await reportsPage.getTaskDetails(1, 2);
      expect(scheduledTask.message).to.contain(testReport.scheduled_tasks[1].messages[0].message);
      expect(scheduledTask.recipient).to.contain(testReport.scheduled_tasks[1].messages[0].to);
      expect(scheduledTask.state).to.contain('scheduled');

      const failedTask = await reportsPage.getTaskDetails(2, 1);
      expect(failedTask.message).to.contain(testReport.scheduled_tasks[2].messages[0].message);
      expect(failedTask.recipient).to.contain(testReport.scheduled_tasks[2].messages[0].to);
      expect(failedTask.state).to.contain('failed');
    });

  });

  (CREDENTIAL_PASS_OUTGOING ? describe : describe.skip)('Webapp submits new GT sms messages', () => {
    it('should update SMS statuses', async () => {
      const pregnancyReportWithTasks = pregnancyReportFactory.pregnancy().build({
        scheduled_tasks: [
          { messages: [{ to: '+254711111222', message: 'message1', uuid: 'uuid1' }], state: 'pending' },
          { messages: [{ to: '+254711111222', message: 'message2', uuid: 'uuid2' }], state: 'pending' },
        ],
        tasks: []
      });

      const waitForLogs = await utils.waitForApiLogs(/Sending 2 messages/);
      await utils.saveDoc(pregnancyReportWithTasks);
      await waitForLogs.promise;
      // make sure the requests were sent before loading reports
      await (await utils.waitForApiLogs(/Sending 0 messages/)).promise;

      await commonPage.goToReports(pregnancyReportWithTasks._id);
      expect(await reportsPage.rightPanelSelectors.reportTasks().isDisplayed()).to.be.true;
      const task1 = await reportsPage.getTaskDetails(1, 1);
      expect(task1).to.deep.include({
        message: 'message1',
        state: 'sent',
        recipient: ' to +254711111222',
      });

      const task2 = await reportsPage.getTaskDetails(1, 2);
      expect(task2).to.deep.include({
        message: 'message2',
        recipient: ' to +254711111222',
        state: 'sent',
      });
    }); 
  });
});
