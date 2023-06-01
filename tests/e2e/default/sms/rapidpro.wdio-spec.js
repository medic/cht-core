const express = require('express');
const bodyParser = require('body-parser');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');

describe('RapidPro SMS Gateway', () => {
  let server;
  let broadcastsEndpointRequests = [];
  let messagesEndpointRequests = [];
  const INCOMING_KEY = 'thecakeisalie';
  //const OUTGOING_KEY = 'ermahgerd';
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

  const setIncomingKey = () => {
    return utils.saveCredentials('rapidpro:incoming', INCOMING_KEY);
  };

  /*const setOutgoingKey = () => {
    return utils.saveCredentials('rapidpro:outgoing', OUTGOING_KEY);
  };*/

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
  });


});

