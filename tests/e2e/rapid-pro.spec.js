const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid/v4');

const commonElements = require('../page-objects/common/common.po.js');
const messagesElements = require('../page-objects/messages/messages.po');
const helper = require('../helper');
const constants = require('../constants');
const utils = require('../utils');

// Mock rapid-pro server
const mockApp = express();
mockApp.use(bodyParser.json());
const broadcastsEndpoint = '/api/v2/broadcasts.json';
const messagesEndpoint = '/api/v2/messages.json';

let broadcastsEndpointRequests = [];
let messagesEndpointRequests = [];
let broadcastsResult = (req, res) => res.status(200).end();
let messagesResult = (req, res) => res.status(200).end();

mockApp.post(broadcastsEndpoint, (req, res) => {
  broadcastsEndpointRequests.push([req.body, req.headers]);
  broadcastsResult(req, res);
});
mockApp.get(messagesEndpoint, (req, res) => {
  messagesEndpointRequests.push([req.query, req.headers]);
  messagesResult(req, res);
});
let server;

const startMockApp = () => {
  return new Promise(resolve => {
    server = mockApp.listen(resolve);
  });
};

const stopMockApp = () => {
  server && server.close();
};

const INCOMING_KEY = 'thecakeisalie';
const OUTGOING_KEY = 'ermahgerd';

const setIncomingKey = () => {
  return utils.request({
    port: constants.COUCH_PORT,
    method: 'PUT',
    path: `/_node/${constants.COUCH_NODE_NAME}/_config/medic-credentials/rapidpro:incoming`,
    body: `${INCOMING_KEY}`
  });
};

const setOutgoingKey = () => {
  return utils.request({
    port: constants.COUCH_PORT,
    method: 'PUT',
    path: `/_node/${constants.COUCH_NODE_NAME}/_config/medic-credentials/rapidpro:outgoing`,
    body: `${OUTGOING_KEY}`
  });
};

describe('RapidPro SMS Gateway', () => {
  afterAll(() => {
    stopMockApp();
    return utils.revertDb();
  });
  beforeAll(() => startMockApp());

  beforeEach(() => {
    broadcastsEndpointRequests = [];
    messagesEndpointRequests = [];
  });
  afterEach(() => utils.revertDb([],true));

  describe('Webapp Terminating messages', () => {
    const endpoint = '/api/v1/sms/radpidpro/incoming-messages';
    const smsSettings = { outgoing_service: 'rapid-pro' };

    it('should fail when service is not enabled', async () => {
      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          headers: { authorization: INCOMING_KEY },
          noAuth: true,
        });
        assert.fail('should have thrown');
      } catch (err) {
        expect(err.responseBody).toEqual({ code: 400, error: 'Service not enabled' });
      }
    });

    it('should fail with no incoming key configured', async () => {
      await utils.updateSettings({ sms: smsSettings });

      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          headers: { authorization: INCOMING_KEY },
          noAuth: true,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).toEqual({ code: 403, error: 'No incoming key configured' });
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
        expect(err.responseBody).toEqual({ code: 403, error: 'Incorrect token: "undefined"' });
      }
    });

    it('should fail with incorrect authentication', async () => {
      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings }, true);

      try {
        await utils.request({
          path: endpoint,
          method: 'POST',
          headers: { authorization: 'not the correct key' },
          noAuth: true,
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).toEqual({ code: 403, error: 'Incorrect token: "not the correct key"' });
      }
    });

    it('should create messages', async () => {
      const message = {
        id: 'the_gateway_ref',
        from: 'the_phone',
        content: 'the sms message content',
      };

      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings }, true);
      const messageResult = await utils.request({
        path: endpoint,
        method: 'POST',
        headers: { authorization: INCOMING_KEY },
        noAuth: true,
        body: message,
      });

      expect(messageResult).toEqual({ saved: 1 });
      await utils.resetBrowser();
      await commonElements.goToMessagesNative();

      // LHS
      const firstMessage = messagesElements.messageByIndex(1);
      await helper.waitElementToBeVisibleNative(firstMessage);

      const heading = messagesElements.listMessageHeading(firstMessage);
      const summary = messagesElements.listMessageSummary(firstMessage);
      expect(await helper.getTextFromElementNative(heading)).toEqual('the_phone');
      expect(await helper.getTextFromElementNative(summary)).toEqual('the sms message content');
      await helper.clickElementNative(summary);

      const firstMessageContent = messagesElements.messageContentIndex(1);
      await helper.waitElementToBeVisibleNative(firstMessageContent);

      const messageHeader = messagesElements.messageDetailsHeader();
      const messageText = messagesElements.messageContentText(firstMessageContent);
      const messageStatus = messagesElements.messageContentState(firstMessageContent);

      expect(await helper.getTextFromElementNative(messageHeader)).toEqual('the_phone');
      expect(await helper.getTextFromElementNative(messageText)).toEqual('the sms message content');
      expect(await helper.getTextFromElementNative(messageStatus)).toEqual('received');

      // database
      const id = await firstMessageContent.getAttribute('data-id');
      const doc = await utils.getDoc(id);
      expect(doc.sms_message && doc.sms_message.gateway_ref).toEqual('the_gateway_ref');
    });
  });

  describe('Webapp originating messages and status updates', () => {
    let settings;
    let reportWithTasks;

    beforeEach(() => {
      settings = {
        sms: {
          outgoing_service: 'rapid-pro',
          rapidPro: { url: `http://localhost:${server.address().port}` },
        }
      };
      reportWithTasks = {
        _id: 'report_with_tasks',
        type: 'data_record',
        form: 'P',
        errors: [],
        reported_date: new Date().getTime(),
        tasks: [
          {
            messages: [{ to: 'phone1', message: 'message1', uuid: 'uuid1' }],
            state: 'pending',
          },
          {
            messages: [{ to: 'phone2', message: 'message2', uuid: 'uuid2' }],
            state: 'sent',
          },
        ],
        scheduled_tasks: [
          {
            messages: [{ to: 'phone3', message: 'message3', uuid: 'uuid3' }],
            state: 'pending',
            group: 2,
            type: 'ANC Reminders LMP',
          },
          {
            messages: [{ to: 'phone4', message: 'message4', uuid: 'uuid4' }],
            state: 'pending',
            group: 2,
            type: 'ANC Reminders LMP',
          },
          {
            messages: [{ to: 'phone5', message: 'message5', uuid: 'uuid5' }],
            state: 'pending',
            group: 3,
            type: 'ANC Reminders LMP',
          },
        ]
      };
    });

    afterEach(() => utils.revertDb([], true));

    it('should not call RapidPro endpoint when service is not set', async () => {
      await utils.saveDoc(reportWithTasks);
      await browser.sleep(1200); // interval to check the queue should run every second

      expect(broadcastsEndpointRequests.length).toEqual(0);
    });

    it('should not call RapidPro endpoint when credentials are not set', async () => {
      await utils.updateSettings(settings, true);

      await utils.saveDoc(reportWithTasks);
      await browser.sleep(1200); // interval to check the queue should run every second

      expect(broadcastsEndpointRequests.length).toEqual(0);
    });

    it('should call endpoint with set credentials', async () => {
      await utils.updateSettings(settings, true);
      await setOutgoingKey();

      await utils.saveDoc(reportWithTasks);
      await browser.wait(() => broadcastsEndpointRequests.length === 4, 1200);

      const bodies = broadcastsEndpointRequests.map(item => item[0]);
      expect(bodies).toEqual([
        { urns: ['tel:phone1'], text: 'message1' },
        { urns: ['tel:phone3'], text: 'message3' },
        { urns: ['tel:phone4'], text: 'message4' },
        { urns: ['tel:phone5'], text: 'message5' },
      ]);
      const headers = broadcastsEndpointRequests.map(item => item[1]);
      expect(headers[0].authorization).toEqual(`Token ${OUTGOING_KEY}`);
      expect(headers[1].authorization).toEqual(`Token ${OUTGOING_KEY}`);
      expect(headers[2].authorization).toEqual(`Token ${OUTGOING_KEY}`);
      expect(headers[3].authorization).toEqual(`Token ${OUTGOING_KEY}`);
    });

    it('should set correct statuses from broadcast api', async () => {
      await utils.updateSettings(settings, true);
      await setOutgoingKey();

      const statuses = ['queued', '', 'queued', 'sent', 'failed'];
      broadcastsResult = (req, res) => {
        // https://rapidpro.io/api/v2/broadcasts
        const idx = req.body.text.replace('message', '');
        res.json({
          id: `broadcast${idx}`,
          status: statuses[idx - 1],
        });
      };

      const { rev } = await utils.saveDoc(reportWithTasks);
      const revNumber = parseInt(rev);
      await browser.wait(() => broadcastsEndpointRequests.length === 4, 1200);
      await utils.waitForDocRev([{ id: reportWithTasks._id, rev: revNumber + 1 }]);

      const report = await utils.getDoc(reportWithTasks._id);
      expect(report.tasks[0].gateway_ref).toEqual('broadcast1');
      expect(report.tasks[0].state).toEqual('received-by-gateway');

      expect(report.tasks[1].gateway_ref).toEqual(undefined);
      expect(report.tasks[1].state).toEqual('sent');

      expect(report.scheduled_tasks[0].gateway_ref).toEqual('broadcast3');
      expect(report.scheduled_tasks[0].state).toEqual('received-by-gateway');

      expect(report.scheduled_tasks[1].gateway_ref).toEqual('broadcast4');
      expect(report.scheduled_tasks[1].state).toEqual('sent');

      expect(report.scheduled_tasks[2].gateway_ref).toEqual('broadcast5');
      expect(report.scheduled_tasks[2].state).toEqual('failed');
    });

    it('should poll for status updates and consume queue', async () => {
      const nonFinalStates = ['received-by-gateway', 'forwarded-by-gateway', 'sent'];
      const finalStates = ['delivered', 'failed'];

      const getNonFinalStateByIds = (idx) => nonFinalStates[idx % 3];
      const getFinalStateByIdx = (idx) => finalStates[idx % 2];
      const getIdx = (ref) => ref.replace('gateway_ref', '');

      const docs = Array.from({ length: 90 }).map((_, idx) => ({
        _id: uuid(),
        type: 'data_record',
        form: 'a',
        reported_date: new Date().getTime(),
        errors: [],
        tasks: [{
          messages: [{ to: `phone${idx}`, message: `message${idx}`, uuid: `uuid${idx}` }],
          gateway_ref: `gateway_ref${idx}`,
          state: getNonFinalStateByIds(idx),
        }],
      }));

      messagesResult = (req, res) => {
        const idx = getIdx(req.query.broadcast);
        res.json({ results: [{ status: getFinalStateByIdx(idx) }] });
      };

      await utils.updateSettings(settings, true);
      await setOutgoingKey();
      await utils.saveDocs(docs);

      await browser.wait(() => messagesEndpointRequests.length === 90, (90 / 25 + 1) * 1000 ); // batch size is 25

      const queriedBroadcasts = messagesEndpointRequests.map(request => request[0].broadcast).sort();
      const expectedBroadcasts = docs.map(doc => doc.tasks[0].gateway_ref).sort();
      expect(queriedBroadcasts).toEqual(expectedBroadcasts);

      await browser.sleep(1100); // wait for another polling iteration

      expect(messagesEndpointRequests.length).toEqual(90); // no additional requests were made

      const updatedDocs = await utils.getDocs(docs.map(doc => doc._id));
      updatedDocs.forEach(doc => {
        const task = doc.tasks[0];
        const idx = getIdx(task.gateway_ref);
        const expectedState = getFinalStateByIdx(idx);
        expect(task.state).toBe(expectedState, `Doc ${idx}(${doc._id}) has incorrect state`);
      })
    });
  });
});
