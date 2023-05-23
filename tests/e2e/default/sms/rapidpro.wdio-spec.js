const express = require('express');
const bodyParser = require('body-parser');
const utils = require('../../../utils');

// Mock rapidpro server


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

  /*const setIncomingKey = () => {
    return utils.saveCredentials('rapidpro:incoming', INCOMING_KEY);
  };*/

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
      await utils.updateSettings({ sms: smsSettings });

      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          headers: { authorization: `Token ${INCOMING_KEY}` },
          noAuth: true,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).to.equal({ code: 403, error: 'No incoming key configured' });
      }
    });

    /*it('should fail with no authentication provided', async () => {
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
        expect(err.responseBody).to.equal({ code: 403, error: 'Missing authorization token' });
      }
    });*/

  });

});

