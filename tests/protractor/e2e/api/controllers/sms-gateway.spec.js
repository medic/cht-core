const utils = require('../../../utils');

fdescribe('/sms', function() {

  describe('GET', function() {

    it('should respond with valid JSON', function() {
      // when
      return get()
        .then(response => {
          // then
          expect(response['medic-gateway']).toBe(true);
        });
    });

  });

  describe('POST', function() {

    it('should accept requests with missing fields', function() {
      return post({})
        .then(expectResponse({ messages:[] }));
    });

    it('should save supplied messages to DB', function() {
      TODO(`
        1. send POST containing a couple of well-formed messages
        2. check that the messages eventually appear in the DB
      `);
    });

    it('should not reject bad message content', function() {
      post({ messages: [ { missing_fields:true } ] })
        .then(expectResponse({ messages:[] }));
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

    it('should update message multiple times when multiple status updates for the same message are received', () => TODO(`
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

    it('should not save a message again if it\'s been seen before', () => TODO(`
      1. POST a message to the endpoint
      2. confirm that the message was saved to the DB
      3. POST the same message to the endpoint again
      4. confirm that the response was OK, and the message was _not_ saved again
    `));

    it('should not save a status update again if it\'s been seen before', () => TODO(`
      1. save a WO message in the database
      2. POST a status update for that message to the endpoint
      3. confirm that the message state has been changed, and that the state update appears in the history
      4. POST the same status update to the endpoint again
      5. confirm that the response was OK, and the message state is still correct, but that the history has not been updated
    `));

  });
});

function get() {
  return utils.request({
    path: '/api/sms',
    method: 'GET',
    headers: { 'Content-Type':'application/json' },
  });
}

function post(body) {
  return utils.request({
    path: '/api/sms',
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: body,
  });
}

function TODO(message = 'this test') {
  expect(message).toBe('implemented');
}

function expectResponse(expected) {
  return response => expect(response).toEqual(expected);
}
