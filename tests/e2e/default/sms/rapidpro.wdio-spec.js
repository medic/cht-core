const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const messagesPage = require('@page-objects/default/sms/messages.wdio.page');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const reportsPage = require('@page-objects/default/reports/reports.wdio.page');
const pregnancyReportFactory = require('@factories/cht/reports/sms-pregnancy');
const genericReportFactory = require('@factories/cht/reports/generic-report');

describe('RapidPro SMS Gateway', () => {
  let server;
  let broadcastsEndpointRequests = [];
  let messagesEndpointRequests = [];

  const mockApp = express();
  const broadcastsEndpoint = '/api/v2/broadcasts.json';
  const messagesEndpoint = '/api/v2/messages.json';
  let broadcastsResult = (req, res) => res.status(200).end();
  let messagesResult = (req, res) => res.status(200).end();

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
        expect(err.responseBody).to.eql({ code: 403, error: 'No incoming key configured' });
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
        expect(err.responseBody).to.eql({ code: 403, error: 'Missing authorization token' });
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
        expect(err.responseBody).to.eql({ code: 403, error: 'Incorrect token' });
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
        expect(err.responseBody).to.eql({ code: 403, error: 'Missing authorization token' });
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
        expect(err.responseBody).to.eql({ code: 400, error: 'Message was not saved' });
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

      expect(messageResult).to.eql({ saved: 1 });

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

      expect(messageResult).to.eql({ saved: 1 });
      await loginPage.cookieLogin();
      await commonPage.goToReports();

      const firstReport = await reportsPage.firstReport();
      const firstReportInfo = await reportsPage.getListReportInfo(firstReport);

      expect(firstReportInfo.heading).to.equal('the_phone');
      expect(firstReportInfo.form).to.equal('My form');

      const reportDoc = await utils.getDoc(firstReportInfo.dataId);
      expect(reportDoc.form).to.equal('FORM');
      expect(reportDoc.fields).to.eql({ some_data: 'the data' });
    });
  }); // End describe 'Webapp Terminating messages'

  describe('Webapp originating messages and state updates', () => {
    const OUTGOING_KEY = 'ermahgerd';
    const setOutgoingKey = () => {
      return utils.saveCredentials('rapidpro:outgoing', OUTGOING_KEY);
    };

    const verifyPhoneAndMessage = (obj, index) => {
      expect(obj.urns).to.eql([`tel:phone${index}`]);
      expect(obj.text).to.equal(`message${index}`);
    };

    const verifyGatewayRefAndState = (obj, gateway, state) => {
      expect(obj.gateway_ref).to.equal(gateway);
      expect(obj.state).to.equal(state);
    };

    const pregnancyReportWithTasks = pregnancyReportFactory.pregnancy().build({
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
    });

    beforeEach(async () => {
      const settings = {
        sms: {
          outgoing_service: 'rapidpro',
          rapidpro: { url: utils.hostURL(server.address().port) },
        }
      };
      await utils.updateSettings(settings, true);
    });

    afterEach(() => utils.revertDb([], true));


    it('should not call RapidPro endpoint when credentials are not set', async () => {
      await utils.saveDoc(pregnancyReportWithTasks);
      await browser.pause(1200); // interval to check the queue should run every second
      expect(broadcastsEndpointRequests.length).to.equal(0);
    });

    it('should call endpoint with set credentials', async () => {
      await setOutgoingKey();

      await utils.saveDoc(pregnancyReportWithTasks);
      await browser.waitUntil(() => broadcastsEndpointRequests.length === 4, 1200);

      const bodies = broadcastsEndpointRequests
        .map(item => item[0])
        .sort((a, b) => a.text.localeCompare(b.text));

      verifyPhoneAndMessage(bodies[0], 1);
      verifyPhoneAndMessage(bodies[1], 3);
      verifyPhoneAndMessage(bodies[2], 4);
      verifyPhoneAndMessage(bodies[3], 5);

      const headers = broadcastsEndpointRequests.map(item => item[1]);
      expect(headers.length).to.equal(4);
      headers.forEach(header => expect(header.authorization).to.equal(`Token ${OUTGOING_KEY}`));
    });

    it('should set correct states from broadcast api', async () => {
      await setOutgoingKey();

      const statuses = ['queued', '', 'queued', 'sent', 'failed'];
      broadcastsResult = (req, res) => {
        const idx = req.body.text.replace('message', '');
        res.json({
          id: `broadcast${idx}`,
          status: statuses[idx - 1],
        });
      };

      const { rev } = await utils.saveDoc(pregnancyReportWithTasks);
      const revNumber = parseInt(rev);
      await browser.waitUntil(() => broadcastsEndpointRequests.length === 4, 1200);
      await utils.waitForDocRev([{ id: pregnancyReportWithTasks._id, rev: revNumber + 1 }]);

      const report = await utils.getDoc(pregnancyReportWithTasks._id);
      verifyGatewayRefAndState(report.tasks[0], 'broadcast1', 'received-by-gateway');
      verifyGatewayRefAndState(report.tasks[1], undefined, 'sent');
      verifyGatewayRefAndState(report.scheduled_tasks[0], 'broadcast3', 'received-by-gateway');
      verifyGatewayRefAndState(report.scheduled_tasks[1], 'broadcast4', 'sent');
      verifyGatewayRefAndState(report.scheduled_tasks[2], 'broadcast5', 'failed');
    });

    it('should update the states correctly from messages api', async () => {
      const genReport = (id, index) => genericReportFactory.reportWithTasks().build({
        _id: id,
        tasks: [{
          messages: [{ to: `phone${index}`, message: `message${index}`, uuid: `uuid${index}` }],
          gateway_ref: `gateway_ref_${id}`,
          state: 'received-by-gateway',
        }]
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

      await setOutgoingKey();
      await utils.saveDocs(docs);

      await browser.waitUntil(() => {
        const requestedBroadcastIds = messagesEndpointRequests.map(([query]) => query.broadcast);
        return _.uniq(requestedBroadcastIds).length === 7;
      }, 4000);
      await browser.pause(1000); // wait for the docs to actually be updated

      const requestedBroadcastIds = [];
      const expectedBroadcastIds = docs.map(doc => doc.tasks[0].gateway_ref).sort();
      messagesEndpointRequests.forEach(([ query, headers ]) => {
        expect(query.broadcast).to.exist;
        expect(expectedBroadcastIds.includes(query.broadcast)).to.be.true;
        requestedBroadcastIds.push(query.broadcast);
        expect(headers.authorization).to.equal(`Token ${OUTGOING_KEY}`);
      });

      // we don't have complete control over which docs are requested in the provided timespan
      const sortedUniqueRequestedBroadcasts = _.uniq(requestedBroadcastIds.sort());
      expect(expectedBroadcastIds).to.eql(sortedUniqueRequestedBroadcasts);

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
        expect(updatedDoc.tasks[0].state).to.equal(state);
      });
    });

    it('should not poll messages for docs that are in pending or scheduled states or lack gateway ref ', async () => {
      const genReport = (state) => genericReportFactory.reportWithTasks().build({
        tasks: [{
          messages: [{ to: 'phone', message: 'message', uuid: 'uuid' }],
          gateway_ref: 'gateway_ref',
          state: state,
        }]
      });

      const docs = [
        genReport('queued'),
        genReport('scheduled'),
        genReport('muted'),
        genReport('duplicate'),
        genReport('cleared'),
        genericReportFactory.reportWithTasks().build({
          tasks: [{
            messages: [{ to: 'phone', message: 'message', uuid: 'uuid' }],
            state: 'received-by-gateway',
          }]
        })
      ];

      await setOutgoingKey();
      await utils.saveDocs(docs);
      await browser.pause(1200); // wait for timer to trigger
      expect(messagesEndpointRequests.length).to.equal(0); // no requests made
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

      const doc = genericReportFactory.reportWithTasks().build();

      let idx = 0;
      messagesResult = (req, res) => {
        const nextStatus = statusChangeList[idx];
        idx++;
        res.json({ results: [{ status: nextStatus }] });
      };

      await setOutgoingKey();
      await utils.saveDoc(doc);

      await browser.waitUntil(() => messagesEndpointRequests.length === 6, 7 * 1000 );
      await browser.pause(1200); // wait for one extra iteration

      expect(messagesEndpointRequests.length).to.equal(6); // no additional requests

      const updatedDoc = await utils.getDoc(doc._id);
      expect(updatedDoc.tasks[0].state_history.length).to.equal(6);
      expect(updatedDoc.tasks[0].state).to.equal('delivered');

      const states = updatedDoc.tasks[0].state_history.map(history => history.state);
      expect(states).to.eql([
        'received-by-gateway',
        'forwarded-by-gateway',
        'sent',
        'received-by-gateway',
        'sent',
        'delivered',
      ]);

      messagesEndpointRequests.forEach(([ query ]) => {
        expect(query.broadcast).to.equal('gateway_ref');
      });
    });

    it('should poll for state updates and consume queue', async () => {
      const nonFinalStates = ['received-by-gateway', 'forwarded-by-gateway', 'sent'];
      const finalStates = ['delivered', 'failed'];
      const docsCount = 90;
      const getNonFinalStateByIds = (idx) => nonFinalStates[idx % 3];
      const getFinalStateByIdx = (idx) => finalStates[idx % 2];
      const getIdx = (ref) => ref.replace('gateway_ref', '');

      const docs = Array.from({ length: docsCount }).map((_, idx) => genericReportFactory.reportWithTasks().build({
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

      await setOutgoingKey();
      await utils.saveDocs(docs);

      const iterations = docsCount / 25; // batch size is 25
      await browser.waitUntil(() => messagesEndpointRequests.length === docsCount, (iterations + 2) * 1000 );

      const queriedBroadcasts = messagesEndpointRequests.map(request => request[0].broadcast).sort();
      const expectedBroadcasts = docs.map(doc => doc.tasks[0].gateway_ref).sort();
      expect(queriedBroadcasts).to.eql(expectedBroadcasts);

      await browser.pause(1100); // wait for another polling iteration

      expect(messagesEndpointRequests.length).to.equal(docsCount); // no additional requests were made

      const updatedDocs = await utils.getDocs(docs.map(doc => doc._id));
      updatedDocs.forEach(doc => {
        const task = doc.tasks[0];
        const idx = getIdx(task.gateway_ref);
        const expectedState = getFinalStateByIdx(idx);
        expect(task.state).to.equal(expectedState, `Doc ${idx}(${doc._id}) has incorrect state`);
      });
    });

    it('should handle rate limiting when polling', async () => {
      const docs = Array.from({ length: 90 }).map((_, idx) => genericReportFactory.reportWithTasks().build({
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

      await setOutgoingKey();
      await utils.saveDocs(docs);

      await browser.pause(4 * 1000);
      // depending on how many polling iterations (each iteration will try to get state for one message, fail and stop)
      // we get an additional request per iteration
      expect(messagesEndpointRequests.length).to.be.below(16); // maximum 4 polling iterations
      let updatedDocs = await utils.getDocs(docs.map(doc => doc._id));
      let docsWithUpdatedMessages = updatedDocs.filter(doc => doc.tasks[0].state === 'delivered');
      expect(docsWithUpdatedMessages.length).to.equal(10);

      const requestsAfterFirstPass = messagesEndpointRequests.length;

      messagesResult = (req, res) => {
        if (messagesEndpointRequests.length > requestsAfterFirstPass + 10) {
          res.status(429);
          return res.end();
        }
        res.json({ results: [{ status: 'delivered' }] });
      };

      await browser.pause(4 * 1000);
      expect(messagesEndpointRequests.length).to.be.below(requestsAfterFirstPass + 15);

      updatedDocs = await utils.getDocs(docs.map(doc => doc._id));
      docsWithUpdatedMessages = updatedDocs.filter(doc => doc.tasks[0].state === 'delivered');
      expect(docsWithUpdatedMessages.length).to.equal(20);
    });

  }); //End describe 'Webapp originating messages and state updates'

});

