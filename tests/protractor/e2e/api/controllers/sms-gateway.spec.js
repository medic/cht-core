const utils = require('../../../utils');

const CHW_CONTACT_NUMBER = '+32049832049';

fdescribe('/sms', function() {

  describe('test setup', function() {
    fit('should make PouchDB instance available', function() {
      expect(utils.db.query).toBeDefined();
    });
  });

  describe('GET', function() {

    fit('should respond with valid JSON', function() {
      // when
      return get()
        .then(response => {
          // then
          expect(response['medic-gateway']).toBe(true);
        });
    });

  });

  describe('POST', function() {

    afterAll(() => utils.revertDb());

    afterEach(() => {
      // delete WO and WT messages
      return utils.db.query('medic-client/messages_by_contact_date',
          { reduce:false, include_docs:true })
        .then(res => Promise.all(res.rows.map(row => utils.db.remove(row.doc))));
    });

    describe('for webapp-terminating message processing', function() {

      fit('should accept requests with missing fields', function() {
        return post({})
          .then(() => expectResponse({ messages:[] }));
      });

      fit('should save supplied messages to DB', function() {
        return postMessages(
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
          .then(() => expectResponse({ messages:[] }))

          .then(() => expectMessagesInDb('test 1', 'test 2'));
      });

      fit('should not reject bad message content', function() {
        postMessage({ missing_fields:true })
          .then(() => expectResponse({ messages:[] }));
      });

      fit('should save all good messages in a request containing some good and some bad', function() {
        return postMessages(
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
          .then(() => expectResponse({ messages:[] }))

          .then(() => expectMessagesInDb('should be saved'));
        // TODO if the endpoint is supposed to be non-blocking, add a waiting loop around the relevant assertions.
      });

      fit('should not save a message if its id has been seen before', function() {
        return postMessage(
          {
            id: 'a-1',
            content: 'once-only',
            from: '+1',
            sms_sent: 1520354329379,
            sms_received: 1520354329389,
          }
        )
          .then(() => expectResponse({ messages:[] }))
          .then(() => expectMessageInDb('once-only'))

          .then(() => postMessage(
            {
              id: 'a-1',
              content: 'not-again',
              from: '+2',
              sms_sent: 1520354329382,
              sms_received: 1520354329392,
            }
          ))
          .then(() => expectResponse({ messages:[] }))
          .then(() => expectMessageInDb('once-only'));
      });

    });

    describe('for webapp-originating message processing', function() {

      fit('should update message in DB when status update is received', function() {
        return saveWoMessage('abc-123', 'hello from webapp')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatus('abc-123', 'SENT'))
          .then(() => expectResponse({ messages:[] }))

          .then(() => expectMessageState('abc-123', 'sent'));
      });

      fit('should update message multiple times when multiple status updates for the same message are received', function() {
        return saveWoMessage('abc-123', 'hello again')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatuses(
              { id:'abc-123', status:'SENT' },
              { id:'abc-123', status:'DELIVERED' }))
          .then(() => expectResponse({ messages:[] }))

          .then(() => expectMessageStates({ id:'abc-123', states:['sent', 'delivered'] }));
      });

      fit('should not save a status update again if it\'s been seen before', () => TODO(`
        1. save a WO message in the database
        2. POST a status update for that message to the endpoint
        3. confirm that the message state has been changed, and that the state update appears in the history
        4. POST the same status update to the endpoint again
        5. confirm that the response was OK, and the message state is still correct, but that the history has not been updated
      `));

    });

    fit('should still save messages when an unrecognised status update is received', () => TODO(`
      1. send POST request containing a status update for an unknown message, and
         a good message definition
      2. check that no error is returned
      3. check that message was created in DB
      4. if the endpoint is supposed to be non-blocking, add a waiting loop around
         the relevant assertions.
    `));

    fit('should return as quickly as possible', () => TODO(`
      1. make a POST with lots of stuff in it
      2. check that the response is received reeeeal fast
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

function postMessage(...messages) {
  return postMessages(...messages);
}

function postMessages(...messages) {
  return post({ messages });
}

function TODO(message = 'this test') {
//  expect(message).toBe('implemented');
}

function expectResponse(expected) {
  return response => expect(response).toEqual(expected);
}

function expectMessageInDb(...contents) {
  return expectMessagesInDb(...contents);
}

function expectMessagesInDb(...expectedContents) {
  expectedContents = JSON.stringify(expectedContents);

  return new Promise((resolve, reject) => {
    const endTime = Date.now() + 10000;

    check();

    function check() {
      utils.db.query('medic-client/messages_by_contact_date', { reduce:false })
        .then(response => {
          const actualContents = JSON.stringify(
              response &&
              response.rows &&
              response.rows.map(row => row.value && row.value.message));

          if(JSON.stringify(actualContents) === JSON.stringify(expectedContents)) {
            resolve();
          } else if(Date.now() < endTime) {
            setTimeout(check, 500);
          } else {
            reject(`Expected:\n      ${actualContents}\n    to equal:\n      ${expectedContents}`);
          }
        })
        .catch(reject);
    }
  });
}

function saveWoMessage(id, content) {
  const task = {
    messages: [
      {
        from: '+123',
        sent_by: 'some name',
        to: CHW_CONTACT_NUMBER,
        contact: {},
        message: content,
        uuid: id,
      }
    ]
  };

  const messageDoc = {
    errors: [],
    form: null,
    from: '+123',
    reported_date: 1520416423761,
    tasks: [ task ],
    kujua_message: true,
    type: 'data_record',
    sent_by: 'some name',
  };

  return utils.db.post(messageDoc);
}

function postStatus(messageId, newStatus) {
  return postStatuses({ id:messageId, status:newStatus });
}

function postStatuses(...updates) {
  return post({ updates });
}

function expectMessageWithoutState(id) {
  return expectMessageStates({ id });
}

function expectMessageState(id, state) {
  return expectMessageStates({ id, state });
}

function expectMessageStates(...expectedStates) {
  expectedStates.forEach(expectation => {
    if(expectation.state) {
      expectation.states = [ expectation.state ];
      delete expectation.state;
    }
  });

  expectedStates = JSON.stringify(expectedStates);

  return new Promise((resolve, reject) => {
    const endTime = Date.now() + 10000;

    check();

    function check() {
      utils.db.query('medic-client/messages_by_contact_date', { reduce:false, include_docs:true })
        .then(response => {
          const actualStates = JSON.stringify(response.rows.reduce((acc, row) => {
            row.doc.tasks.forEach(task => task.messages.forEach(m => {
              const states = task.state_history && task.state_history.map(h => h.state);
              acc.push({ id:m.uuid, states });
            }));
            return acc;
          }, []));

          if(actualStates === expectedStates) {
            resolve();
          } else if(Date.now() < endTime) {
            setTimeout(check, 500);
          } else {
            reject(`Expected:\n      ${actualStates}\n    to equal:\n      ${expectedStates}`);
          }
        })
        .catch(reject);
    }
  });
}
