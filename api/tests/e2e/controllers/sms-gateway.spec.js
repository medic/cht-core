const assert = require('chai').assert;
const utils = require('../utils');
const apiPost = utils.apiPost;

describe('SMS Gateway API', () => {

  beforeEach(() => utils.cleanDb());

  it('should respond to GET requests to show the endpoint supports the gateway API', () =>
    utils.apiGet('/api/sms')
      .then(result => assert.isTrue(result['medic-gateway'])));

  it('should save supplied messages to DB', () => {

    // given
    const exampleMessages = [
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
      },
    ];

    // when
    return apiPost('/api/sms', { messages:exampleMessages })

      .then(response => {

        // then
        assertGood(response);
        assertMessagesExist(exampleMessages);

      });
  });


  it('should not reject bad message content', () => {

    // given
    const badRequestObject = {
      TODO: true,
    };

    // when
    return apiPost('/api/sms', badRequestObject)

      .then(response => {

        // then
        assertGood(response);
        assertNoMessagesExist();

      });
  });


  it('should save all good messages in a request containing some good and some bad', () => TODO(`
    1. send POST request containing some message JSON for some good and some bad
       messages
    2. check that no error is returned
    3. check that only good messages were created in DB
    4. if the endpoint is supposed to be non-blocking, add a waiting loop around
       the relevant assertions.
  `));

  it('should update message in DB when status update is received', () => TODO(`
    1. save a message in the DB
    2. send POST request containing a status update for that message
    3. check that message state was updated as expected
  `));

  it('should update message multiple times when multilpe status updates for the same message are received', () => TODO(`
    1. save a message in the DB
    2. send POST request containing multiple status updates for that message
    3. check that message state and state_history were updated as expected
  `));

  it('should still save messages when an unrecognised status update is received', () => TODO(`
    1. send POST request containing a status update for an unknown message, and
       a good message definition
    2. check that no error is returned
    3. check that message was created in DB
    4. if the endpoint is supposed to be non-blocking, add a waiting loop around
       the relevant assertions.
  `));

});

function TODO(toImplement) {
  assert.fail(null, null, 'The following needs to be implemented:\n' + toImplement);
}

function assertGood(response) {
  assert.equal(typeof response, 'object');
}

function assertMessagesExist(...messages) {
  // TODO
}

function assertNoMessagesExist() {
  // TODO
}
