const chai = require('chai');
const testUtils = require('@utils');
const gatewayApiUtils = require('@utils/gateway-api');
const api = gatewayApiUtils.api;
const db = gatewayApiUtils.db;
const setup = gatewayApiUtils.setup;


describe('/sms', function() {

  describe('GET', function() {

    it('should respond with valid JSON', function() {
      // when
      return api.get()
        .then(response => {
          // then
          chai.expect(response['medic-gateway']).to.be.true;
        });
    });

  });

  describe('POST', function() {

    after(() => testUtils.revertDb([], true));

    afterEach(gatewayApiUtils.cleanUp);

    describe('for webapp-terminating message processing', function() {

      it('should accept requests with missing fields', function() {
        return api.post({})
          .then(assert.response({ messages:[] }));
      });

      it('should save supplied messages to DB', function() {
        return api.postMessages(
          {
            id: 'test-sms-1',
            from: '+111-test',
            content: 'test 1',
            sms_sent: 1511179010577,
            sms_received: 1511189010577,
          },
          {
            id: 'test-sms-2',
            from: '+222-test',
            content: 'test 2',
            sms_sent: 1511179020577,
            sms_received: 1511189020577,
          }
        )
          .then(assert.response({ messages:[] }))

          .then(() => assert.messagesInDb('test 1', 'test 2'));
      });

      it('should not reject bad message content', function() {
        return api.postMessage({ missing_fields:true })
          .then(assert.response({ messages:[] }));
      });

      it('should save all good messages in a request containing some good and some bad', function() {
        return api.postMessages(
          { bad_message:true },
          {
            good_message: true,
            id: 'abc-123',
            from: '+1',
            content: 'should be saved',
            sms_sent: 1520354329376,
            sms_received: 1520354329386,
          },
          { good_message:false }
        )
          .then(assert.response({ messages:[] }))

          .then(() => assert.messageInDb('should be saved'));
      });

      it('should not save a message if its id has been seen before', function() {
        return api.postMessage(
          {
            id: 'a-1',
            content: 'once-only',
            from: '+1',
            sms_sent: 1520354329379,
            sms_received: 1520354329389,
          }
        )
          .then(assert.response({ messages:[] }))
          .then(() => assert.messageInDb('once-only'))

          .then(() => api.postMessage(
            {
              id: 'a-1',
              content: 'not-again',
              from: '+2',
              sms_sent: 1520354329382,
              sms_received: 1520354329392,
            }
          ))
          .then(assert.response({ messages:[] }))
          .then(() => assert.messageInDb('once-only'));
      });

    });

    describe('for webapp-originating message processing', function() {

      it('should update message in DB when status update is received', function() {
        return setup.saveWoMessage('abc-123', 'hello from webapp')
          .then(() => assert.messageWithoutState('abc-123'))

          .then(() => api.postStatus('abc-123', 'SENT'))
          .then(assert.response({ messages:[] }))

          .then(() => assert.messageState('abc-123', 'sent'));
      });

      it('should update message multiple times when multiple status updates for the same message are received', () => {
        return setup.saveWoMessage('abc-123', 'hello again')
          .then(() => assert.messageWithoutState('abc-123'))

          .then(() => api.postStatuses(
            { id:'abc-123', status:'SENT' },
            { id:'abc-123', status:'DELIVERED' }))
          .then(assert.response({ messages:[] }))

          .then(() => assert.messageStates({ id:'abc-123', states:['sent', 'delivered'] }));
      });

      it('should not reject messages with unexpected status values', function() {
        return setup.saveWoMessage('abc-123', 'hello from webapp')
          .then(() => assert.messageWithoutState('abc-123'))

          .then(() => api.postStatus('abc-123', 'WEIRD_STATUS'))
          .then(assert.response({ messages:[] }))

          .then(() => assert.messageState('abc-123', 'unrecognised'));
      });

      it('should not reject messages with missing status values', function() {
        return setup.saveWoMessage('abc-123', 'hello from webapp')
          .then(() => assert.messageWithoutState('abc-123'))

          .then(() => api.post({ updates:[ { id:'abc-123' } ] }))
          .then(assert.response({ messages:[] }))

          .then(() => assert.messageState('abc-123', 'unrecognised'));
      });

      it('should not save a status update again if it\'s been seen before', function() {
        return setup.saveWoMessage('abc-123', 'hello again')
          .then(() => assert.messageWithoutState('abc-123'))

          .then(() => api.postStatus('abc-123', 'SENT'))
          .then(assert.response({ messages:[] }))
          .then(() => assert.messageStates({ id:'abc-123', states:['sent'] }))

          .then(() => api.postStatus('abc-123', 'SENT'))
          .then(assert.response({ messages:[] }))
          .then(() => assert.messageStates({ id:'abc-123', states:['sent'] }));
      });

    });

    it('should still save messages when a status update for an unknown message is received', function() {
      return setup.saveWoMessage('abc-123', 'hello again')
        .then(() => assert.messageWithoutState('abc-123'))

        .then(() => api.postStatuses(
          { id:'abc-123', status:'SENT' },
          { id:'def-456', status:'DELIVERED' }))
        .then(assert.response({ messages:[] }))
        .then(() => assert.messageStates({ id:'abc-123', states:['sent'] }));
    });

    it('should still save messages when an unrecognised status update is received', function() {
      return setup.saveWoMessage('abc-123', 'hello again')
        .then(() => assert.messageWithoutState('abc-123'))

        .then(() => api.postStatus('abc-123', 'WTF'))
        .then(assert.response({ messages:[] }))
        .then(() => assert.messageStates({ id:'abc-123', states:['unrecognised'] }));
    });

  });
});

const assert = {

  response: (expected) => {
    return response => chai.expect(response).to.deep.equal(expected);
  },

  messageInDb: (...contents) => {
    return assert.messagesInDb(...contents);
  },

  messagesInDb: (...expectedContents) => {
    expectedContents = JSON.stringify(expectedContents);

    return new Promise((resolve, reject) => {
      const endTime = Date.now() + 10000;
      const check = () => {
        db.getMessageContents()
          .then(actualContents => {
            actualContents = JSON.stringify(actualContents);

            if(actualContents === expectedContents) {
              resolve();
            } else if(Date.now() < endTime) {
              setTimeout(check, 100);
            } else {
              reject(`Expected:\n      ${actualContents}\n    to equal:\n      ${expectedContents}`);
            }
          })
          .catch(reject);
      };
      check();
    });
  },

  messageWithoutState: (id) => {
    return assert.messagesWithoutState(id);
  },

  messagesWithoutState: (...ids) => {
    return assert.messageStates(...ids.map(id => ({ id })));
  },

  messageState: (id, state) => {
    return assert.messageStates({ id, state });
  },

  messageStates: (...expectedStates) => {
    expectedStates.forEach(expectation => {
      if(expectation.state) {
        expectation.states = [ expectation.state ];
        delete expectation.state;
      }
    });

    expectedStates = JSON.stringify(expectedStates);

    return new Promise((resolve, reject) => {
      const endTime = Date.now() + 10000;

      const check = () => {
        db.getMessageStates()
          .then(actualStates => {
            actualStates = JSON.stringify(actualStates);

            if(actualStates === expectedStates) {
              resolve();
            } else if(Date.now() < endTime) {
              setTimeout(check, 100);
            } else {
              reject(`Expected:\n      ${actualStates}\n    to equal:\n      ${expectedStates}`);
            }
          })
          .catch(reject);
      };

      check();
    });
  },

};
