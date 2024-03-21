const { expect, assert } = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const request = require('request-promise-native');
const secureSettings = require('@medic/settings');
const config = require('../../../src/config');
const db = require('../../../src/db');
const messaging = require('../../../src/services/messaging');
const service = rewire('../../../src/services/rapidpro');

const generateMessages = (count = 25) => Array
  .from({ length: count })
  .map((_, i) => ({ value: { id: `message${i}`, gateway_ref: `broadcast${i}` } }));

describe('RapidPro SMS Gateway', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('send', () => {
    it('should throw an error if getting credentials fails', () => {
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'https://self-hosted-rapid-pro.net' } });
      sinon.stub(secureSettings, 'getCredentials').rejects({ error: 'omg' });
      return service
        .send()
        .then(() => assert.fail('Should have thrown'))
        .catch(err => expect(err).to.deep.equal({ error: 'omg' }));
    });

    it('should throw an error when no credentials are defined', () => {
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'https://self-hosted-rapid-pro.net' } });
      sinon.stub(secureSettings, 'getCredentials').resolves();
      return service
        .send()
        .then(() => assert.fail('Should have thrown'))
        .catch(err => expect(err).to.include('No api key configured.'));
    });

    it('should forward an error when no RapidPro url is defined', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('textitapikey');
      sinon.stub(config, 'get').returns({ });

      return service
        .send()
        .then(() => assert.fail('Should have thrown'))
        .catch(err => expect(err).to.include('No RapidPro URL configured'));
    });

    it('should forward messages to custom RapidPro instance', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('customRapidPro');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'https://self-hosted-rapid-pro.net' } });

      const messages = [
        { to: 'phone1', content: 'message1', id: 'one' },
        { to: 'phone2', content: 'message2', id: 'two' },
      ];
      sinon.stub(request, 'post').resolves({ id: 'broadcastId', status: 'queued' });

      return service.send(messages).then((result) => {
        expect(request.post.callCount).to.equal(2);
        expect(request.post.args[0]).to.deep.equal([{
          baseUrl: 'https://self-hosted-rapid-pro.net',
          uri: '/api/v2/broadcasts.json',
          json: true,
          body: { urns: ['tel:phone1'], text: 'message1', },
          headers: { Accept: 'application/json', Authorization: 'Token customRapidPro' },
        }]);

        expect(request.post.args[1]).to.deep.equal([{
          baseUrl: 'https://self-hosted-rapid-pro.net',
          uri: '/api/v2/broadcasts.json',
          json: true,
          body: { urns: ['tel:phone2'], text: 'message2', },
          headers: { Accept: 'application/json', Authorization: 'Token customRapidPro' },
        }]);

        expect(result).to.deep.equal([
          { messageId: 'one', gatewayRef: 'broadcastId', state: 'received-by-gateway', details: 'Queued' },
          { messageId: 'two', gatewayRef: 'broadcastId', state: 'received-by-gateway', details: 'Queued' },
        ]);
      });
    });

    it('should return correct statuses and ids', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('textitapikey');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'https://self-hosted-rapid-pro.net' } });

      const messages = [
        { to: 'phone1', content: 'message1', id: 'one' },
        { to: 'phone2', content: 'message2', id: 'two' },
        { to: 'phone3', content: 'message3', id: 'three' },
        { to: 'phone4', content: 'message4', id: 'four' },
        { to: 'phone5', content: 'message5', id: 'five' },
        { to: 'phone6', content: 'message6', id: 'six' },
        { to: 'phone7', content: 'message7', id: 'seven' },
      ];

      sinon.stub(request, 'post')
        .withArgs(sinon.match({ body: { text: 'message1' } })).resolves({ id: 'broadcast1', status: 'queued' })
        .withArgs(sinon.match({ body: { text: 'message2' } })).resolves({ id: 'broadcast2', status: 'wired' })
        .withArgs(sinon.match({ body: { text: 'message3' } })).resolves({ id: 'broadcast3', status: 'sent' })
        .withArgs(sinon.match({ body: { text: 'message4' } })).resolves({ id: 'broadcast4', status: 'delivered' })
        .withArgs(sinon.match({ body: { text: 'message5' } })).resolves({ id: 'broadcast5', status: 'resent' })
        .withArgs(sinon.match({ body: { text: 'message6' } })).resolves({ id: 'broadcast6', status: 'errored' })
        .withArgs(sinon.match({ body: { text: 'message7' } })).resolves({ id: 'broadcast7', status: 'failed' });

      return service.send(messages).then((result) => {
        expect(request.post.callCount).to.equal(7);

        expect(result).to.deep.equal([
          { messageId: 'one', gatewayRef: 'broadcast1', state: 'received-by-gateway', details: 'Queued' },
          { messageId: 'two', gatewayRef: 'broadcast2', state: 'forwarded-by-gateway', details: 'Wired' },
          { messageId: 'three', gatewayRef: 'broadcast3', state: 'sent', details: 'Sent' },
          { messageId: 'four', gatewayRef: 'broadcast4', state: 'delivered', details: 'Delivered' },
          { messageId: 'five', gatewayRef: 'broadcast5', state: 'sent', details: 'Resent' },
          { messageId: 'six', gatewayRef: 'broadcast6', state: 'received-by-gateway', details: 'Errored' },
          { messageId: 'seven', gatewayRef: 'broadcast7', state: 'failed', details: 'Failed' },
        ]);
      });
    });

    it('should catch errors and handle empty results', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('textitapikey');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'https://self-hosted-rapid-pro.net' } });

      const messages = [
        { to: 'phone1', content: 'message1', id: 'one' },
        { to: 'phone2', content: 'message2', id: 'two' },
        { to: 'phone3', content: 'message3', id: 'three' },
        { to: 'phone4', content: 'message4', id: 'four' },
      ];

      sinon.stub(request, 'post')
        .withArgs(sinon.match({ body: { text: 'message1' } })).resolves({ id: 'broadcast1', status: 'queued' })
        .withArgs(sinon.match({ body: { text: 'message2' } })).resolves()
        .withArgs(sinon.match({ body: { text: 'message3' } })).rejects({ some: 'error' })
        .withArgs(sinon.match({ body: { text: 'message4' } })).resolves({ id: 'broadcast4', status: 'queued' });

      return service.send(messages).then((result) => {
        expect(request.post.callCount).to.equal(4);

        expect(result).to.deep.equal([
          { messageId: 'one', gatewayRef: 'broadcast1', state: 'received-by-gateway', details: 'Queued' },
          { messageId: 'four', gatewayRef: 'broadcast4', state: 'received-by-gateway', details: 'Queued' },
        ]);
      });
    });
  });

  describe('poll', () => {
    const nonFinalStatuses = [
      'received-by-gateway',
      'forwarded-by-gateway',
      'sent',
    ];

    afterEach(() => {
      service.__set__('skip', 0);
      service.__set__('polling', false);
    });

    it('should catch error if getting credentials fails', () => {
      sinon.stub(secureSettings, 'getCredentials').rejects({ error: 'omg' });
      sinon.stub(db.medic, 'query');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://host.com' } });
      return service.poll().then(() => {
        expect(db.medic.query.callCount).to.equal(0);
        expect(secureSettings.getCredentials.callCount).to.equal(1);
      });
    });

    it('should catch error when no credentials are defined', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves();
      sinon.stub(db.medic, 'query');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://host.com' } });
      return service.poll().then(() => {
        expect(db.medic.query.callCount).to.equal(0);
        expect(secureSettings.getCredentials.callCount).to.equal(1);
      });
    });

    it('it throws an error when no RapidPro host is not configured', () => {
      sinon.stub(secureSettings, 'getCredentials');
      sinon.stub(db.medic, 'query');
      sinon.stub(config, 'get');

      return service.poll().then(() => {
        expect(db.medic.query.callCount).to.equal(0);
        expect(secureSettings.getCredentials.callCount).to.equal(0);
        expect(config.get.callCount).to.equal(1);
        expect(config.get.args[0]).to.deep.equal(['sms']);
      });
    });

    it('it throws an error when no RapidPro host is not configured', () => {
      sinon.stub(secureSettings, 'getCredentials');
      sinon.stub(db.medic, 'query');
      sinon.stub(config, 'get').returns({ rapidpro: {} });

      return service.poll().then(() => {
        expect(db.medic.query.callCount).to.equal(0);
        expect(secureSettings.getCredentials.callCount).to.equal(0);
        expect(config.get.callCount).to.equal(1);
        expect(config.get.args[0]).to.deep.equal(['sms']);
      });
    });

    it('should start polling from 0', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('apikey');
      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      sinon.stub(messaging, 'updateMessageTaskStates');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://host.com' } });

      return service.poll().then(() => {
        expect(secureSettings.getCredentials.callCount).to.equal(1);
        expect(secureSettings.getCredentials.args[0]).to.deep.equal(['rapidpro:outgoing']);
        expect(db.medic.query.callCount).to.equal(1);
        expect(db.medic.query.args[0]).to.deep.equal([
          'medic-sms/gateway_messages_by_state',
          {
            keys: nonFinalStatuses,
            skip: 0,
            limit: 25,
          },
        ]);
        expect(messaging.updateMessageTaskStates.callCount).to.equal(0);
      });
    });

    it('it gets status updates for every result', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('key');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://self-hosted.com' } });

      const messages = Array
        .from({ length: 25 })
        .map((_, i) => ({ value: { id: `message${i}`, gateway_ref: `broadcast${i}` } }));
      sinon.stub(db.medic, 'query')
        .onCall(0).resolves({ rows: messages })
        .onCall(1).resolves({ rows: [] });
      sinon.stub(messaging, 'updateMessageTaskStates').resolves();
      sinon.stub(request, 'get').resolves();

      return service.poll().then(() => {
        expect(request.get.callCount).to.equal(25);
        request.get.args.forEach((args, i) => expect(args).to.deep.equal([{
          baseUrl: 'http://self-hosted.com',
          uri: '/api/v2/messages.json',
          json: true,
          qs: { broadcast: `broadcast${i}` },
          headers: { Accept: 'application/json', Authorization: 'Token key' },
        }]));
        expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
        expect(messaging.updateMessageTaskStates.args[0]).to.deep.equal([[]]);
      });
    });

    it('should skip messages that have no gateway_ref', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('key');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://self-hosted.com' } });

      const messages = [
        { value: { id: 'message1' } },
        { value: { id: 'message2', gateway_ref: 'ref2' } },
        { value: { id: 'message3' } },
        { value: { id: 'message4', gateway_ref: 'ref4' } },
      ];
      sinon.stub(db.medic, 'query')
        .onCall(0).resolves({ rows: messages })
        .onCall(1).resolves({ rows: [] });
      sinon.stub(messaging, 'updateMessageTaskStates').resolves();
      sinon.stub(request, 'get').resolves();

      return service.poll().then(() => {
        expect(request.get.callCount).to.equal(2);

        expect(request.get.args[0]).to.deep.equal([{
          baseUrl: 'http://self-hosted.com',
          uri: '/api/v2/messages.json',
          json: true,
          qs: { broadcast: `ref2` },
          headers: { Accept: 'application/json', Authorization: 'Token key' },
        }]);

        expect(request.get.args[1]).to.deep.equal([{
          baseUrl: 'http://self-hosted.com',
          uri: '/api/v2/messages.json',
          json: true,
          qs: { broadcast: `ref4` },
          headers: { Accept: 'application/json', Authorization: 'Token key' },
        }]);
      });
    });

    it('should update the states correctly', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('key');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'https://textit.in' } });

      const messages = [
        { value: { id: 'message1', gateway_ref: 'ref1' } },
        { value: { id: 'message2', gateway_ref: 'ref2' } },
        { value: { id: 'message3', gateway_ref: 'ref3' } },
        { value: { id: 'message4', gateway_ref: 'ref4' } },
      ];
      sinon.stub(db.medic, 'query')
        .onCall(0).resolves({ rows: messages })
        .onCall(1).resolves({ rows: [] });
      sinon.stub(messaging, 'updateMessageTaskStates').resolves();
      sinon.stub(request, 'get')
        .withArgs(sinon.match({ qs: { broadcast: 'ref1' } })).resolves({ results: [{ status: 'wired' }] })
        .withArgs(sinon.match({ qs: { broadcast: 'ref2' } })).resolves({ results: [{ status: 'sent' }] })
        .withArgs(sinon.match({ qs: { broadcast: 'ref3' } })).resolves({ results: [{ status: 'delivered' }] })
        .withArgs(sinon.match({ qs: { broadcast: 'ref4' } })).resolves({ results: [{ status: 'failed' }] });

      return service.poll().then(() => {
        expect(request.get.callCount).to.equal(4);

        expect(request.get.args[0][0]).to.deep.include({
          baseUrl: 'https://textit.in',
          uri: '/api/v2/messages.json',
          qs: { broadcast: `ref1` },
          headers: { Accept: 'application/json', Authorization: 'Token key' },
        });
        expect(request.get.args[1][0]).to.deep.include({
          baseUrl: 'https://textit.in',
          uri: '/api/v2/messages.json',
          qs: { broadcast: `ref2` },
          headers: { Accept: 'application/json', Authorization: 'Token key' },
        });
        expect(request.get.args[2][0]).to.deep.include({
          baseUrl: 'https://textit.in',
          uri: '/api/v2/messages.json',
          qs: { broadcast: `ref3` },
        });
        expect(request.get.args[3][0]).to.deep.include({
          baseUrl: 'https://textit.in',
          uri: '/api/v2/messages.json',
          qs: { broadcast: `ref4` },
        });

        expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
        expect(messaging.updateMessageTaskStates.args[0]).to.deep.equal([[
          { messageId: 'message1', gatewayRef: 'ref1', state: 'forwarded-by-gateway', details: 'Wired' },
          { messageId: 'message2', gatewayRef: 'ref2', state: 'sent', details: 'Sent' },
          { messageId: 'message3', gatewayRef: 'ref3', state: 'delivered', details: 'Delivered' },
          { messageId: 'message4', gatewayRef: 'ref4', state: 'failed', details: 'Failed' },
        ]]);
      });
    });

    it('should only use 1st result from service', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('key');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://textit.in' } });

      const messages = [
        { value: { id: 'msg1', gateway_ref: 'broadcast1' } },
        { value: { id: 'msg2', gateway_ref: 'broadcast2' } },
      ];

      sinon.stub(db.medic, 'query')
        .onCall(0).resolves({ rows: messages })
        .onCall(1).resolves({ rows: [] });
      sinon.stub(messaging, 'updateMessageTaskStates').resolves();
      sinon.stub(request, 'get')
        .withArgs(sinon.match({ qs: { broadcast: 'broadcast1' } }))
        .resolves({ results: [{ status: 'sent' }, { status: 'queued' }] })
        .withArgs(sinon.match({ qs: { broadcast: 'broadcast2' } }))
        .resolves({ results: [{ status: 'delivered' }, { status: 'sent' }] });

      return service.poll().then(() => {
        expect(request.get.callCount).to.equal(2);

        expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
        expect(messaging.updateMessageTaskStates.args[0]).to.deep.equal([[
          { messageId: 'msg1', gatewayRef: 'broadcast1', state: 'sent', details: 'Sent' },
          { messageId: 'msg2', gatewayRef: 'broadcast2', state: 'delivered', details: 'Delivered' },
        ]]);
      });
    });

    it('should handle the remote service not sending any results', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('key');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://textit.in' } });

      const messages = [
        { value: { id: 'msg1', gateway_ref: 'broadcast1' } },
        { value: { id: 'msg2', gateway_ref: 'broadcast2' } },
      ];

      sinon.stub(db.medic, 'query')
        .onCall(0).resolves({ rows: messages })
        .onCall(1).resolves({ rows: [] });
      sinon.stub(messaging, 'updateMessageTaskStates').resolves();
      sinon.stub(request, 'get').resolves();

      return service.poll().then(() => {
        expect(request.get.callCount).to.equal(2);
        expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
        expect(messaging.updateMessageTaskStates.args[0]).to.deep.equal([[]]);
      });
    });

    describe('should only increase skip with the number of processed statuses and keep querying', () => {
      beforeEach(() => {
        sinon.stub(secureSettings, 'getCredentials').resolves('key');
        sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://textit.in' } });
        sinon.stub(request, 'get').resolves();
      });

      it('no updates', () => {
        sinon.stub(messaging, 'updateMessageTaskStates').resolves({ saved: 0 });

        const messages = generateMessages(25);
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: messages })
          .onCall(1).resolves({ rows: messages })
          .onCall(2).resolves({ rows: [] });

        expect(service.__get__('skip')).to.equal(0);

        return service.poll().then(() => {
          expect(db.medic.query.callCount).to.equal(3);
          expect(db.medic.query.args).to.deep.equal([
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 0 }],
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 25 }],
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 50 }],
          ]);
          expect(service.__get__('skip')).to.equal(0);
        });
      });

      it('100% updates', () => {
        sinon.stub(messaging, 'updateMessageTaskStates').resolves({ saved: 25 });

        const messages = generateMessages(25);
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: messages })
          .onCall(1).resolves({ rows: [] });

        expect(service.__get__('skip')).to.equal(0);
        return service.poll().then(() => {
          expect(service.__get__('skip')).to.equal(0);
          expect(db.medic.query.callCount).to.equal(2);
          expect(db.medic.query.args).to.deep.equal([
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 0 }],
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 0 }],
          ]);
        });
      });

      it('some updates out of lower count result set', () => {
        sinon.stub(messaging, 'updateMessageTaskStates')
          .onCall(0).resolves({ saved: 10 })
          .onCall(1).resolves({ saved: 8 })
          .onCall(2).resolves({ saved: 16 });
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: generateMessages(12) })
          .onCall(1).resolves({ rows: generateMessages(16) })
          .onCall(2).resolves({ rows: generateMessages(23) })
          .onCall(3).resolves({ rows: [] });

        expect(service.__get__('skip')).to.equal(0);

        return service.poll().then(() => {
          expect(service.__get__('skip')).to.equal(0);
          expect(db.medic.query.callCount).to.equal(4);
          expect(db.medic.query.args).to.deep.equal([
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 0 }],
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 2 }],
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 10 }],
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 17 }],
          ]);
        });
      });

      it('no updates out of lower count result set', () => {
        sinon.stub(messaging, 'updateMessageTaskStates').resolves({ saved: 0 });
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: generateMessages(12) })
          .onCall(1).resolves({ rows: generateMessages(12) })
          .onCall(2).resolves({ rows: [] });

        expect(service.__get__('skip')).to.equal(0);
        return service.poll().then(() => {
          expect(service.__get__('skip')).to.equal(0);
          expect(db.medic.query.callCount).to.equal(3);
          expect(db.medic.query.args).to.deep.equal([
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 0 }],
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 12 }],
            ['medic-sms/gateway_messages_by_state', { keys: nonFinalStatuses, limit: 25, skip: 24 }],
          ]);
        });
      });
    });

    describe('recursive polling', () => {
      const expectedStatusUpdates = (messages, state, details) => messages.map(message => ({
        messageId: message.value.id,
        gatewayRef: message.value.gateway_ref,
        state,
        details,
      }));

      beforeEach(() => {
        sinon.stub(secureSettings, 'getCredentials').resolves('key');
        sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://textit.in' } });
      });

      it('should go over the whole list of items', () => {
        sinon.stub(messaging, 'updateMessageTaskStates').callsFake(list => Promise.resolve({ saved: list.length }));
        const allMessages = [
          generateMessages(25),
          generateMessages(25),
          generateMessages(25),
          generateMessages(10),
          [],
        ];
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: allMessages[0] })
          .onCall(1).resolves({ rows: allMessages[1] })
          .onCall(2).resolves({ rows: allMessages[2] })
          .onCall(3).resolves({ rows: allMessages[3] })
          .onCall(4).resolves({ rows: allMessages[4] });
        // all messages get to be delivered, so they disappear from our query
        sinon.stub(request, 'get').resolves({ results: [{ status: 'delivered' }] });

        expect(service.__get__('skip')).to.equal(0);
        return service.poll().then(() => {
          expect(service.__get__('skip')).to.equal(0); // all updated, so none skipped!

          expect(db.medic.query.callCount).to.equal(5);
          expect(db.medic.query.args[0][1]).to.deep.equal({ keys: nonFinalStatuses, limit: 25, skip: 0 });
          expect(db.medic.query.args[1][1]).to.deep.equal({ keys: nonFinalStatuses, limit: 25, skip: 0 });
          expect(db.medic.query.args[2][1]).to.deep.equal({ keys: nonFinalStatuses, limit: 25, skip: 0 });
          expect(db.medic.query.args[3][1]).to.deep.equal({ keys: nonFinalStatuses, limit: 25, skip: 0 });
          expect(db.medic.query.args[4][1]).to.deep.equal({ keys: nonFinalStatuses, limit: 25, skip: 0 });

          expect(messaging.updateMessageTaskStates.callCount).to.equal(4);
          let expectedStatuses = expectedStatusUpdates(allMessages[0], 'delivered', 'Delivered');
          expect(messaging.updateMessageTaskStates.args[0]).to.deep.equal([expectedStatuses]);
          expectedStatuses = expectedStatusUpdates(allMessages[1], 'delivered', 'Delivered');
          expect(messaging.updateMessageTaskStates.args[1]).to.deep.equal([expectedStatuses]);
          expectedStatuses = expectedStatusUpdates(allMessages[2], 'delivered', 'Delivered');
          expect(messaging.updateMessageTaskStates.args[2]).to.deep.equal([expectedStatuses]);
          expectedStatuses = expectedStatusUpdates(allMessages[3], 'delivered', 'Delivered');
          expect(messaging.updateMessageTaskStates.args[3]).to.deep.equal([expectedStatuses]);
        });
      });

      it('should reset skip when the queue is empty', () => {
        sinon.stub(messaging, 'updateMessageTaskStates').resolves({ saved: 0 });
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: generateMessages(25) })
          .onCall(1).resolves({ rows: generateMessages(10) })
          .onCall(2).resolves({ rows: [] });
        // all messages get to be delivered, so they disappear from our query
        sinon.stub(request, 'get').resolves({ results: [{ status: 'queued' }] });

        expect(service.__get__('skip')).to.equal(0);
        return service.poll().then(() => {
          expect(service.__get__('skip')).to.equal(0); // skip reset
          expect(db.medic.query.callCount).to.equal(3);
          expect(db.medic.query.args[0][1]).to.deep.equal({ keys: nonFinalStatuses, limit: 25, skip: 0 });
          expect(db.medic.query.args[1][1]).to.deep.equal({ keys: nonFinalStatuses, limit: 25, skip: 25 });
          expect(db.medic.query.args[2][1]).to.deep.equal({ keys: nonFinalStatuses, limit: 25, skip: 35 });

          expect(messaging.updateMessageTaskStates.callCount).to.equal(2);
        });
      });

      it('should halt recursive polling on rate limit error', () => {
        sinon.stub(messaging, 'updateMessageTaskStates').callsFake(list => Promise.resolve({ saved: list.length }));
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: generateMessages(25) })
          .onCall(1).resolves({ rows: generateMessages(15) })
          .onCall(2).resolves({ rows: [] });
        sinon.stub(request, 'get')
          .resolves({ results: [{ status: 'delivered' }] })
          .onCall(10).rejects({ statusCode: 429, error: 'Request was throttled' });

        return service
          .poll()
          .then(() => {
            expect(request.get.callCount).to.equal(11);
            expect(db.medic.query.callCount).to.equal(1);
            expect(db.medic.query.args[0][1].skip).to.equal(0);

            expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
            expect(messaging.updateMessageTaskStates.args[0][0].length).to.equal(10);
            expect(service.__get__('skip')).to.equal(0); // all updated, so none skipped!
            expect(service.__get__('throttled')).to.equal(true);

            return service.poll();
          })
          .then(() => {
            // should resume polling
            expect(request.get.callCount).to.equal(26);
            expect(db.medic.query.callCount).to.equal(3);
            expect(db.medic.query.args[1][1].skip).to.equal(0);
            expect(db.medic.query.args[2][1].skip).to.equal(0);

            expect(messaging.updateMessageTaskStates.callCount).to.equal(2);
            expect(messaging.updateMessageTaskStates.args[1][0].length).to.equal(15);
            expect(service.__get__('skip')).to.equal(0); // queue finished
            expect(service.__get__('throttled')).to.equal(false);
          });
      });

      it('should save correct skip when polling is halted because of rate limiting', () => {
        sinon.stub(messaging, 'updateMessageTaskStates').resolves({ saved: 0 });
        sinon.stub(db.medic, 'query')
          .onCall(0).resolves({ rows: generateMessages(25) })
          .onCall(1).resolves({ rows: generateMessages(15) })
          .onCall(2).resolves({ rows: [] });
        sinon.stub(request, 'get')
          .resolves({ results: [{ status: 'delivered' }] })
          .onCall(10).rejects({ statusCode: 429, error: 'Request was throttled' });

        return service
          .poll()
          .then(() => {
            expect(request.get.callCount).to.equal(11);
            expect(db.medic.query.callCount).to.equal(1);
            expect(db.medic.query.args[0][1].skip).to.equal(0);

            expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
            expect(messaging.updateMessageTaskStates.args[0][0].length).to.equal(10);
            expect(service.__get__('skip')).to.equal(10); // none updated, all skipped
            expect(service.__get__('throttled')).to.equal(true);

            return service.poll();
          })
          .then(() => {
            // should resume polling
            expect(request.get.callCount).to.equal(26);
            expect(db.medic.query.callCount).to.equal(3);
            expect(db.medic.query.args[1][1].skip).to.equal(10); // none updated, all skipped
            expect(db.medic.query.args[2][1].skip).to.equal(25); // none updated, all skipped

            expect(messaging.updateMessageTaskStates.callCount).to.equal(2);
            expect(messaging.updateMessageTaskStates.args[1][0].length).to.equal(15);
            expect(service.__get__('skip')).to.equal(0); // queue finished
            expect(service.__get__('throttled')).to.equal(false);
          });
      });
    });

    it('should catch errors from remote service', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('key');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://textit.in' } });

      const messages = [
        { value: { id: 'msg1', gateway_ref: 'broadcast1' } },
        { value: { id: 'msg2', gateway_ref: 'broadcast2' } },
        { value: { id: 'msg3', gateway_ref: 'broadcast3' } },
      ];

      sinon.stub(db.medic, 'query')
        .onCall(0).resolves({ rows: messages })
        .onCall(1).resolves({ rows: [] });

      sinon.stub(messaging, 'updateMessageTaskStates').resolves();
      sinon.stub(request, 'get')
        .onCall(0).resolves({ results: [{ status: 'sent' }] })
        .onCall(1).rejects({ some: 'error' })
        .onCall(2).resolves({ results: [{ status: 'delivered' }] });

      return service.poll().then(() => {
        expect(request.get.callCount).to.equal(3);
        expect(db.medic.query.callCount).to.equal(2);

        expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
        expect(messaging.updateMessageTaskStates.args[0]).to.deep.equal([[
          { messageId: 'msg1', gatewayRef: 'broadcast1', state: 'sent', details: 'Sent' },
          { messageId: 'msg3', gatewayRef: 'broadcast3', state: 'delivered', details: 'Delivered' },
        ]]);
      });
    });

    it('should catch errors from updating messages', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('key');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://textit.in' } });

      const messages = [
        { value: { id: 'msg1', gateway_ref: 'broadcast1' } },
        { value: { id: 'msg2', gateway_ref: 'broadcast2' } },
        { value: { id: 'msg3', gateway_ref: 'broadcast3' } },
      ];

      sinon.stub(db.medic, 'query')
        .onCall(0).resolves({ rows: messages })
        .onCall(1).resolves({ rows: [] });

      sinon.stub(messaging, 'updateMessageTaskStates').rejects();
      sinon.stub(request, 'get')
        .onCall(0).resolves({ results: [{ status: 'sent' }] })
        .onCall(1).rejects({ some: 'error' })
        .onCall(2).resolves({ results: [{ status: 'delivered' }] });

      return service.poll().then(() => {
        expect(request.get.callCount).to.equal(3);
        expect(db.medic.query.callCount).to.equal(1);

        expect(messaging.updateMessageTaskStates.callCount).to.equal(1);
      });
    });

    it('should only start polling when polling not currently running', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('apikey');
      sinon.stub(db.medic, 'query').resolves({ rows: [] });
      sinon.stub(messaging, 'updateMessageTaskStates');
      sinon.stub(config, 'get').returns({ rapidpro: { url: 'http://host.com' } });

      return Promise
        .all([ service.poll(), service.poll(), service.poll(), service.poll() ])
        .then(() => {
          expect(secureSettings.getCredentials.callCount).to.equal(1);
          expect(db.medic.query.callCount).to.equal(1);
          expect(messaging.updateMessageTaskStates.callCount).to.equal(0);
          return Promise.all([ service.poll(), service.poll(), service.poll(), service.poll() ]);
        })
        .then(() => {
          expect(secureSettings.getCredentials.callCount).to.equal(2);
          expect(db.medic.query.callCount).to.equal(2);
        });
    });
  });
});
