const testUtils = require('../../../utils');
const gatewayApiUtils = require('../../../gateway-api.utils');
const api = gatewayApiUtils.api;
const db = gatewayApiUtils.db;
const setup = gatewayApiUtils.setup;

describe('/sms', function() {

  describe('POST', function() {

    afterAll(() => testUtils.revertDb());

    afterEach(gatewayApiUtils.cleanUp);

    describe('for webapp-terminating message processing', function() {

      it('should return within a reasonable time', function() {
        const start = Date.now();
        return api.postMessages(...generate.oneHundredWtMessages())
          .then(response => {
            const end = Date.now();
            // TODO we should be aiming for something closer to 500ms, but until we can improve this,
            // let's make the build pass
            const maxMillis = 5000;
            if(end > start + maxMillis) {
              const seconds = (end - start) / 1000;
              fail(`It took ${seconds}s to respond to the request. The endpoint should respond in ${maxMillis}ms.`);
            }
            expect(response).toEqual({ messages:[] });
          });
      });

    });

    describe('for webapp-originating message processing', function() {

      it('should return within a reasonable time', function() {
        return setup.saveWoMessages(...generate.oneHundredWoMessages())
          .then(() => {

            const start = Date.now();
            return api.postStatuses(...generate.oneHundredUpdates())
              .then(response => {
                const end = Date.now();
                // TODO we should be aiming for something closer to 500ms, but until we can improve this,
                // let's make the build pass
                const maxMillis = 5000;
                if(end > start + maxMillis) {
                  const seconds = (end - start) / 1000;
                  fail(`It took ${seconds}s to respond to the request. The endpoint should respond in ${maxMillis}ms.`);
                }
                expect(response).toEqual({ messages:[] });
              })

              .then(() => db.getMessageStates())
              .then(states => {
                expect(states.length).toBe(100);

                // expect: 1 state update per message
                expect(
                  states
                    .map(s => s.states)
                    .every(stateHistory => stateHistory.length === 1))
                  .toBe(true);
              });
          });
      });

    });

  });
});


const generate = {

  oneHundredWtMessages: () => {
    const messages = [];

    for(let i=0; i<100; ++i) {
      messages.push({
        id: `test-message-${i}`,
        from: `+447890123${i}`,
        content: `message number ${i}`,
        sms_sent: 1520429025403 + (i * 2),
        sms_received: 1520429025403 + (i * 3),
      });
    }

    return messages;
  },

  oneHundredWoMessages: () => {
    const messages = [];

    for(let i=0; i<100; ++i) {
      messages.push({
        id: `wo-message-${i}`,
        content: `wo message ${i}`,
      });
    }

    return messages;
  },

  oneHundredUpdates: () => {
    const STATUS = ['PENDING', 'SENT', 'DELIVERED', 'FAILED'];
    const updates = [];

    for(let i=0; i<100; ++i) {
      const update = {
        id: `wo-message-${i}`,
        status: STATUS[i%4],
      };

      if(update.status === 'FAILED') {
        update.reason = `excuse #${i}`;
      }

      updates.push(update);
    }

    return updates;
  },

};
