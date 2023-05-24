const utils = require('@utils');
const querystring = require('querystring');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const loginPage = require('@page-objects//default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const smsPregancy = require('@factories/cht/reports/sms-pregnancy');

const CREDENTIAL_PASS = 'yabbadabbadoo';
const CREDENTIAL_KEY = 'africastalking.com:incoming';

describe('africas talking api', () => {
  before( () => utils.saveCredentials(CREDENTIAL_KEY, CREDENTIAL_PASS) );

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

    beforeEach(async () => {
      submitSms({ from: '+64271234567', text: 'Hello', id: 'messageID' });
      await loginPage.cookieLogin();
    });

    it('- shows content', async () => {
      const rawNumber = '+64271234567';
      const message = 'Hello';

      await commonPage.goToMessages();
      const { heading, summary} = await messagesPage.getMessageInListDetails(rawNumber);
      expect(heading).to.equal(rawNumber);
      expect(summary).to.equal(message);

      await messagesPage.openMessage(rawNumber);

      const { name } = await messagesPage.getMessageHeader();
      expect(name).to.equal(rawNumber);

      const { content, state, dataID } = await messagesPage.getMessageContent(1);
      expect(content).to.equal(message);
      expect(state).to.equal('received');

      const doc = await utils.getDoc(dataID);
      expect(doc.sms_message && doc.sms_message.gateway_ref).to.equal('messageID');
    });

  });

  describe('- gateway submits WT sms status updates', () => {
    let savedDoc;
    let testReport;

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
      testReport = smsPregancy.pregnancy().build();
      return utils
        .saveDoc(testReport)
        .then(result => {
          savedDoc = result.id;
          return Promise.all([
            submitDeliveryReport({ id: testReport.tasks[0].gateway_ref, status: 'Submitted' }),
            submitDeliveryReport({ id: testReport.scheduled_tasks[0].gateway_ref, status: 'Success' }),
            submitDeliveryReport({
              id: testReport.scheduled_tasks[2].gateway_ref,
              status: 'Failed',
              failureReason: 'InsufficientCredit' }),
          ]);
        });
    });

    afterEach(() => utils.deleteDoc(savedDoc));

    it('- shows content', async () => {
      await commonPage.goToReports();
      const firstReport = await reportsPage.firstReport();
      const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

      expect(firstReportInfo.heading).to.equal('Shannon');
      expect(firstReportInfo.form).to.equal('P');

      await reportsPage.openSelectedReport(firstReport);
      await commonPage.waitForPageLoaded();

      const automaticReply = await reportsPage.getAutomaticReply();
      expect(automaticReply.message).to.include(testReport.tasks[0].messages[0].message);
      expect(automaticReply.recipient).to.include(testReport.tasks[0].messages[0].to);

      expect(await (await reportsPage.reportTasks()).isDisplayed()).to.be.true;

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
});
