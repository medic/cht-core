const express = require('express');
const bodyParser = require('body-parser');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
//const smsPregancy = require('@factories/cht/reports/sms-pregnancy');

describe('RapidPro SMS Gateway', () => {
  let server;
  let broadcastsEndpointRequests = [];
  let messagesEndpointRequests = [];

  const mockApp = express();
  const broadcastsEndpoint = '/api/v2/broadcasts.json';
  const messagesEndpoint = '/api/v2/messages.json';
  const broadcastsResult = (req, res) => res.status(200).end();
  const messagesResult = (req, res) => res.status(200).end();

  mockApp.use(bodyParser.json());

  mockApp.post(broadcastsEndpoint, (req, res) => {
    broadcastsEndpointRequests.push([req.body, req.headers]);
    broadcastsResult(req, res);
  });
  mockApp.get(messagesEndpoint, (req, res) => {
    messagesEndpointRequests.push([req.query, req.headers]);
    messagesResult(req, res);
  });

  const startMockApp = () => {
    return new Promise(resolve => {
      server = mockApp.listen(resolve);
    });
  };

  const stopMockApp = () => {
    server && server.close();
  };

  before(() => startMockApp());

  after(() => {
    stopMockApp();
    utils.revertDb([/^form:/], true);
  });

  beforeEach(() => {
    broadcastsEndpointRequests = [];
    messagesEndpointRequests = [];
  });

  afterEach(() => utils.revertDb([/^form:/], true));

  describe('Webapp Terminating messages', () => {
    const endpoint = '/api/v2/sms/rapidpro/incoming-messages';
    const smsSettings = { outgoing_service: 'rapidpro' };

    const INCOMING_KEY = 'thecakeisalie';
    const setIncomingKey = () => {
      return utils.saveCredentials('rapidpro:incoming', INCOMING_KEY);
    };

    it('should fail with no incoming key configured', async () => {
      await utils.updateSettings({ sms: smsSettings }, true);
      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          headers: { authorization: `Token ${INCOMING_KEY}` },
          noAuth: true,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).to.contain({ code: 403, error: 'No incoming key configured' });
      }
    });

    it('should fail with no authentication provided', async () => {
      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings }, true);

      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          noAuth: true,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).to.contain({ code: 403, error: 'Missing authorization token' });
      }
    });

    it('should fail with incorrect authentication', async () => {
      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings }, true);

      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          headers: { authorization: 'Token not the correct key' },
          noAuth: true,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).to.contain({ code: 403, error: 'Incorrect token' });
      }
    });

    it('should fail with malformed authentication', async () => {
      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings }, true);

      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          headers: { authorization: `Tokens ${INCOMING_KEY}` },
          noAuth: true,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).to.contain({ code: 403, error: 'Missing authorization token' });
      }
    });

    it('should fail when message was not created', async () => {
      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings }, true);

      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          headers: { authorization: `Token ${INCOMING_KEY}` },
          noAuth: true,
          body: { from: 'phone', content: 'test content' },
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).to.contain({ code: 400, error: 'Message was not saved' });
      }
    });

    it('should create messages', async () => {
      const smsId = 'the_gateway_ref';
      const rawPhone = '+50689999999';
      const smsContent = 'the sms message content';

      const message = {
        id: smsId,
        from: rawPhone,
        content: smsContent,
      };

      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings }, true);
      const messageResult = await utils.request({
        path: endpoint,
        method: 'POST',
        headers: { authorization: `Token ${INCOMING_KEY}` },
        noAuth: true,
        body: message,
      });

      expect(messageResult).to.contain({ saved: 1 });

      await loginPage.cookieLogin();
      await commonPage.goToMessages();

      const { heading, summary} = await messagesPage.getMessageInListDetails(rawPhone);
      expect(heading).to.equal(rawPhone);
      expect(summary).to.equal(smsContent);

      await messagesPage.openMessage(rawPhone);
      const { name } = await messagesPage.getMessageHeader();
      expect(name).to.equal(rawPhone);

      const { content, state, dataId } = await messagesPage.getMessageContent(1);
      expect(content).to.equal(smsContent);
      expect(state).to.equal('received');

      const doc = await utils.getDoc(dataId);
      expect(doc.sms_message.gateway_ref).to.equal(smsId);
    });

    it('should create reports', async () => {
      const forms = {
        FORM: {
          meta: {
            code: 'FORM',
            icon: '',
            translation_key: 'My form',
          },
          fields: {
            some_data: {
              type: 'string',
              required: true,
              position: 0,
            },
          },
          public_form: true,
        }
      };

      const message = {
        id: 'the_gateway_ref',
        from: 'the_phone',
        content: 'FORM the data',
      };

      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings, forms }, true);

      const messageResult = await utils.request({
        path: endpoint,
        method: 'POST',
        headers: { authorization: `Token ${INCOMING_KEY}` },
        noAuth: true,
        body: message,
      });

      expect(messageResult).to.contain({ saved: 1 });
      await loginPage.cookieLogin();
      await commonPage.goToReports();

      const firstReport = await reportsPage.firstReport();
      const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

      expect(firstReportInfo.heading).to.equal('the_phone');
      expect(firstReportInfo.form).to.equal('My form');

      const reportDoc = await utils.getDoc(firstReportInfo.dataId);
      expect(reportDoc.form).to.equal('FORM');
      expect(reportDoc.fields).to.contain({ some_data: 'the data' });
    });
  }); // End describe 'Webapp Terminating messages'

  describe('Webapp originating messages and state updates', () => {
    let settings;
    let reportWithTasks;

    const OUTGOING_KEY = 'ermahgerd';
    const setOutgoingKey = () => {
      return utils.saveCredentials('rapidpro:outgoing', OUTGOING_KEY);
    };

    beforeEach(() => {
      settings = {
        sms: {
          outgoing_service: 'rapidpro',
          rapidpro: {url: utils.hostURL(server.address().port)},
        }
      };
      //reportWithTasks = smsPregancy.pregnancy().build();
      reportWithTasks = {
        _id: 'report_with_tasks',
        type: 'data_record',
        form: 'P',
        errors: [],
        reported_date: new Date().getTime(),
        tasks: [
          {
            messages: [{to: 'phone1', message: 'message1', uuid: 'uuid1'}],
            state: 'pending',
          },
          {
            messages: [{to: 'phone2', message: 'message2', uuid: 'uuid2'}],
            state: 'sent',
          },
        ],
        scheduled_tasks: [
          {
            messages: [{to: 'phone3', message: 'message3', uuid: 'uuid3'}],
            state: 'pending',
            group: 2,
            type: 'ANC Reminders LMP',
          },
          {
            messages: [{to: 'phone4', message: 'message4', uuid: 'uuid4'}],
            state: 'pending',
            group: 2,
            type: 'ANC Reminders LMP',
          },
          {
            messages: [{to: 'phone5', message: 'message5', uuid: 'uuid5'}],
            state: 'pending',
            group: 3,
            type: 'ANC Reminders LMP',
          },
        ]
      };
    });

    afterEach(() => utils.revertDb([], true));

    //});

    it('should not call RapidPro endpoint when credentials are not set', async () => {
      await utils.updateSettings(settings, true);
      await utils.saveDoc(reportWithTasks);

      expect(broadcastsEndpointRequests.length).to.equal(0);
    });

    // eslint-disable-next-line no-only-tests/no-only-tests
    it.only('should call endpoint with set credentials', async () => {
      await utils.updateSettings(settings, true);
      await setOutgoingKey();

      await utils.saveDoc(reportWithTasks);
      await browser.waitUntil(() => broadcastsEndpointRequests.length === 4, 1200);

      const bodies = broadcastsEndpointRequests
        .map(item => item[0])
        .sort((a, b) => a.text.localeCompare(b.text));

      const headers = broadcastsEndpointRequests.map(item => item[1]);
      expect(bodies).to.equal([
        { urns: ['tel:phone1'], text: 'message1' },
        { urns: ['tel:phone3'], text: 'message3' },
        { urns: ['tel:phone4'], text: 'message4' },
        { urns: ['tel:phone5'], text: 'message5' },
      ]);
      //const headers = broadcastsEndpointRequests.map(item => item[1]);
      expect(headers[0].authorization).to.equal(`Token ${OUTGOING_KEY}`);
      expect(headers[1].authorization).to.equal(`Token ${OUTGOING_KEY}`);
      expect(headers[2].authorization).to.equal(`Token ${OUTGOING_KEY}`);
      expect(headers[3].authorization).to.equal(`Token ${OUTGOING_KEY}`);
    });

  }); //End describe 'Webapp originating messages and state updates'

});

