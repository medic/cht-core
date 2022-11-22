const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid').v4;
const _ = require('lodash');

const commonElements = require('../../../page-objects/protractor/common/common.po.js');
const messagesElements = require('../../../page-objects/protractor/sms/messages.po');
const reportsElements = require('../../../page-objects/protractor/reports/reports.po');
const helper = require('../../../helper');
const utils = require('../../../utils');

// Mock rapidpro server
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
  return utils.saveCredentials('rapidpro:incoming', INCOMING_KEY);
};

const setOutgoingKey = () => {
  return utils.saveCredentials('rapidpro:outgoing', OUTGOING_KEY);
};

describe('RapidPro SMS Gateway', () => {
  beforeAll(() => startMockApp());
  afterAll(() => {
    stopMockApp();
    return utils.revertDb();
  });

  beforeEach(() => {
    broadcastsEndpointRequests = [];
    messagesEndpointRequests = [];
  });
  afterEach(() => utils.revertDb([], true));

  describe('Webapp Terminating messages', () => {
    const endpoint = '/api/v1/sms/radpidpro/incoming-messages';
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
        expect(err.responseBody).toEqual({ code: 403, error: 'Missing authorization token' });
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
        expect(err.responseBody).toEqual({ code: 403, error: 'Incorrect token' });
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
        expect(err.responseBody).toEqual({ code: 403, error: 'Missing authorization token' });
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
          body: { from: 'phone', content: 'aaaa' },
        });
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.responseBody).toEqual({ code: 400, error: 'Message was not saved' });
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
        headers: { authorization: `Token ${INCOMING_KEY}` },
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

    //use new endpoint: '/api/v2/sms/rapidpro/incoming-messages' 
    it('should create messages', async () => {
      const message = {
        id: 'the_gateway_ref',
        from: 'the_phone',
        content: 'the sms message content',
      };

      await setIncomingKey();
      await utils.updateSettings({ sms: smsSettings }, true);
      const messageResult = await utils.request({
        path: '/api/v2/sms/rapidpro/incoming-messages',
        method: 'POST',
        headers: { authorization: `Token ${INCOMING_KEY}` },
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

      expect(messageResult).toEqual({ saved: 1 });
      await utils.resetBrowser();
      await commonElements.goToReportsNative();

      const firstReport = reportsElements.firstReport();
      await helper.waitUntilReadyNative(firstReport);
      const uuid = await firstReport.getAttribute('data-record-id');

      const reportDoc = await utils.getDoc(uuid);
      expect(reportDoc.form).toEqual('FORM');
      expect(reportDoc.fields).toEqual({ some_data: 'the data' });
    });
  });

  describe('Webapp originating messages and state updates', () => {
    let settings;
    let reportWithTasks;

    beforeEach(() => {
      settings = {
        sms: {
          outgoing_service: 'rapidpro',
          rapidpro: { url: utils.hostURL(server.address().port) },
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

      const bodies = broadcastsEndpointRequests
        .map(item => item[0])
        .sort((a, b) => a.text.localeCompare(b.text));

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

    it('should set correct states from broadcast api', async () => {
      await utils.updateSettings(settings, true);
      await setOutgoingKey();

      const statuses = ['queued', '', 'queued', 'sent', 'failed'];
      broadcastsResult = (req, res) => {
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

    it('should update the states correctly from messages api', async () => {
      const genReport = (id, idx) => ({
        _id: id,
        type: 'data_record',
        form: 'a',
        reported_date: new Date().getTime(),
        errors: [],
        tasks: [{
          messages: [{ to: `phone${idx}`, message: `message${idx}`, uuid: `uuid${idx}` }],
          gateway_ref: `gateway_ref_${id}`,
          state: 'received-by-gateway',
        }],
      });
      const docs = [
        genReport('received_to_queued', 1),
        genReport('received_to_wired', 2),
        genReport('received_to_sent', 3),
        genReport('received_to_resent', 4),
        genReport('received_to_delivered', 5),
        genReport('received_to_errored', 6),
        genReport('received_to_failed', 7),
      ];

      messagesResult = (req, res) => {
        const id = req.query.broadcast.replace('gateway_ref_', '');
        const nextStatus = id.replace('received_to_', '');
        res.json({ results: [{ status: nextStatus }] });
      };

      await utils.updateSettings(settings, true);
      await setOutgoingKey();
      await utils.saveDocs(docs);

      await browser.wait(() => {
        // wait for all records to be updated
        const requestedBroadcastIds = messagesEndpointRequests.map(([query]) => query.broadcast);
        return _.uniq(requestedBroadcastIds).length === 7;
      }, 4000);
      await browser.sleep(1000); // wait for the docs to actually be updated

      const requestedBroadcastIds = [];
      const expectedBroadcastIds = docs.map(doc => doc.tasks[0].gateway_ref).sort();
      messagesEndpointRequests.forEach(([ query, headers ]) => {
        expect(query.broadcast).toBeDefined();
        expect(expectedBroadcastIds.includes(query.broadcast)).toBe(true);
        requestedBroadcastIds.push(query.broadcast);
        expect(headers.authorization).toEqual(`Token ${OUTGOING_KEY}`);
      });
      // we don't have complete control over which docs are requested in the provided timespan
      const sortedUniqueRequestedBroadcasts = _.uniq(requestedBroadcastIds.sort());
      expect(expectedBroadcastIds).toEqual(sortedUniqueRequestedBroadcasts);

      const updatedDocs = await utils.getDocs(docs.map(doc => doc._id));
      const statusMap = [
        ['queued', 'received-by-gateway'],
        ['wired', 'forwarded-by-gateway'],
        ['sent', 'sent'],
        ['delivered', 'delivered'],
        ['resent', 'sent'],
        ['errored', 'received-by-gateway'],
        ['failed', 'failed'],
      ];

      updatedDocs.forEach((updatedDoc) => {
        const status = updatedDoc._id.replace('received_to_', '');
        const state = statusMap.find(map => map[0] === status)[1];
        expect(updatedDoc.tasks[0].state).toBe(state);
      });
    });

    it('should not poll messages for docs that are in pending or scheduled states or lack gateway ref', async () => {
      const docs = [
        {
          _id: uuid(),
          type: 'data_record',
          form: 'a',
          reported_date: new Date().getTime(),
          errors: [],
          tasks: [{
            messages: [{ to: `phone`, message: `message`, uuid: `uuid` }],
            gateway_ref: `gateway_ref`,
            state: 'queued',
          }],
        },
        {
          _id: uuid(),
          type: 'data_record',
          form: 'a',
          reported_date: new Date().getTime(),
          errors: [],
          tasks: [{
            messages: [{ to: `phone`, message: `message`, uuid: `uuid` }],
            gateway_ref: `gateway_ref`,
            state: 'scheduled',
          }],
        },
        {
          _id: uuid(),
          type: 'data_record',
          form: 'a',
          reported_date: new Date().getTime(),
          errors: [],
          tasks: [{
            messages: [{ to: `phone`, message: `message`, uuid: `uuid` }],
            gateway_ref: `gateway_ref`,
            state: 'muted',
          }],
        },
        {
          _id: uuid(),
          type: 'data_record',
          form: 'a',
          reported_date: new Date().getTime(),
          errors: [],
          tasks: [{
            messages: [{ to: `phone`, message: `message`, uuid: `uuid` }],
            gateway_ref: `gateway_ref`,
            state: 'duplicate',
          }],
        },
        {
          _id: uuid(),
          type: 'data_record',
          form: 'a',
          reported_date: new Date().getTime(),
          errors: [],
          tasks: [{
            messages: [{ to: `phone`, message: `message`, uuid: `uuid` }],
            gateway_ref: `gateway_ref`,
            state: 'cleared',
          }],
        },
        {
          _id: uuid(),
          type: 'data_record',
          form: 'a',
          reported_date: new Date().getTime(),
          errors: [],
          tasks: [{
            messages: [{ to: `phone`, message: `message`, uuid: `uuid` }],
            state: 'received-by-gateway',
          }],
        },
      ];

      await utils.updateSettings(settings, true);
      await setOutgoingKey();
      await utils.saveDocs(docs);

      await browser.sleep(1200); // wait for timer to trigger
      expect(messagesEndpointRequests.length).toEqual(0); // no requests made
    });

    it('should keep updating until record is in final state', async () => {
      const statusChangeList = [
        'queued',
        'wired',
        'sent',
        'errored',
        'resent',
        'delivered',
      ];

      const doc = {
        _id: uuid(),
        type: 'data_record',
        form: 'a',
        reported_date: new Date().getTime(),
        errors: [],
        tasks: [{
          messages: [{ to: `phone`, message: `message`, uuid: `uuid` }],
          gateway_ref: `gateway_ref`,
          state: 'received-by-gateway',
        }],
      };

      let idx = 0;
      messagesResult = (req, res) => {
        const nextStatus = statusChangeList[idx];
        idx++;
        res.json({ results: [{ status: nextStatus }] });
      };

      await utils.updateSettings(settings, true);
      await setOutgoingKey();
      await utils.saveDoc(doc);

      await browser.wait(() => messagesEndpointRequests.length === 6, 7 * 1000 );
      await browser.sleep(1200); // wait for one extra iteration

      expect(messagesEndpointRequests.length).toEqual(6); // no additional requests
      const updatedDoc = await utils.getDoc(doc._id);

      expect(updatedDoc.tasks[0].state_history.length).toEqual(6);
      expect(updatedDoc.tasks[0].state).toEqual('delivered');
      const states = updatedDoc.tasks[0].state_history.map(history => history.state);
      expect(states).toEqual([
        'received-by-gateway',
        'forwarded-by-gateway',
        'sent',
        'received-by-gateway',
        'sent',
        'delivered',
      ]);

      messagesEndpointRequests.forEach(([ query ]) => {
        expect(query.broadcast).toEqual('gateway_ref');
      });
    });

    it('should poll for state updates and consume queue', async () => {
      const nonFinalStates = ['received-by-gateway', 'forwarded-by-gateway', 'sent'];
      const finalStates = ['delivered', 'failed'];
      const docsCount = 90;

      const getNonFinalStateByIds = (idx) => nonFinalStates[idx % 3];
      const getFinalStateByIdx = (idx) => finalStates[idx % 2];
      const getIdx = (ref) => ref.replace('gateway_ref', '');

      const docs = Array.from({ length: docsCount }).map((_, idx) => ({
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

      const iterations = docsCount / 25; // batch size is 25
      await browser.wait(() => messagesEndpointRequests.length === docsCount, (iterations + 2) * 1000 );

      const queriedBroadcasts = messagesEndpointRequests.map(request => request[0].broadcast).sort();
      const expectedBroadcasts = docs.map(doc => doc.tasks[0].gateway_ref).sort();
      expect(queriedBroadcasts).toEqual(expectedBroadcasts);

      await browser.sleep(1100); // wait for another polling iteration

      expect(messagesEndpointRequests.length).toEqual(docsCount); // no additional requests were made

      const updatedDocs = await utils.getDocs(docs.map(doc => doc._id));
      updatedDocs.forEach(doc => {
        const task = doc.tasks[0];
        const idx = getIdx(task.gateway_ref);
        const expectedState = getFinalStateByIdx(idx);
        expect(task.state).toBe(expectedState, `Doc ${idx}(${doc._id}) has incorrect state`);
      });
    });

    it('should handle rate limiting when polling', async () => {
      const docs = Array.from({ length: 90 }).map((_, idx) => ({
        _id: uuid(),
        type: 'data_record',
        form: 'a',
        reported_date: new Date().getTime(),
        errors: [],
        tasks: [{
          messages: [{ to: `phone${idx}`, message: `message${idx}`, uuid: `uuid${idx}` }],
          gateway_ref: `gateway_ref${idx}`,
          state: 'received-by-gateway',
        }],
      }));

      messagesResult = (req, res) => {
        if (messagesEndpointRequests.length > 10) {
          res.status(429);
          return res.end();
        }
        res.json({ results: [{ status: 'delivered' }] });
      };

      await utils.updateSettings(settings, true);
      await setOutgoingKey();
      await utils.saveDocs(docs);

      await browser.sleep(4 * 1000);
      // depending on how many polling iterations (each iteration will try to get state for one message, fail and stop)
      // we get an additional request per iteration
      expect(messagesEndpointRequests.length).toBeLessThan(16); // maximum 4 polling iterations
      let updatedDocs = await utils.getDocs(docs.map(doc => doc._id));
      let docsWithUpdatedMessages = updatedDocs.filter(doc => doc.tasks[0].state === 'delivered');
      expect(docsWithUpdatedMessages.length).toEqual(10);

      const requestsAfterFirstPass = messagesEndpointRequests.length;

      messagesResult = (req, res) => {
        if (messagesEndpointRequests.length > requestsAfterFirstPass + 10) {
          res.status(429);
          return res.end();
        }
        res.json({ results: [{ status: 'delivered' }] });
      };

      await browser.sleep(4 * 1000);
      expect(messagesEndpointRequests.length).toBeLessThan(requestsAfterFirstPass + 15);

      updatedDocs = await utils.getDocs(docs.map(doc => doc._id));
      docsWithUpdatedMessages = updatedDocs.filter(doc => doc.tasks[0].state === 'delivered');
      expect(docsWithUpdatedMessages.length).toEqual(20);
    });
  });
});
