const utils = require('../../../utils');

const CHW_CONTACT_NUMBER = '+32049832049';

describe('/sms', function() {

  describe('test setup', function() {
    it('should make PouchDB instance available', function() {
      expect(utils.db.query).toBeDefined();
    });
  });

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

    afterAll(() => utils.revertDb());

    afterEach(() => {
      // delete WO and WT messages
      return utils.db.query('medic-client/messages_by_contact_date',
          { reduce:false, include_docs:true })
        .then(res => Promise.all(res.rows.map(row => utils.db.remove(row.doc))));
    });

    describe('for webapp-terminating message processing', function() {

      it('should accept requests with missing fields', function() {
        return post({})
          .then(expectResponse({ messages:[] }));
      });

      it('should save supplied messages to DB', function() {
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
          .then(expectResponse({ messages:[] }))

          .then(() => expectMessagesInDb('test 1', 'test 2'));
      });

      it('should not reject bad message content', function() {
        postMessage({ missing_fields:true })
          .then(expectResponse({ messages:[] }));
      });

      it('should save all good messages in a request containing some good and some bad', function() {
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
          .then(expectResponse({ messages:[] }))

          .then(() => expectMessagesInDb('should be saved'));
        // TODO if the endpoint is supposed to be non-blocking, add a waiting loop around the relevant assertions.
      });

      it('should not save a message if its id has been seen before', function() {
        return postMessage(
          {
            id: 'a-1',
            content: 'once-only',
            from: '+1',
            sms_sent: 1520354329379,
            sms_received: 1520354329389,
          }
        )
          .then(expectResponse({ messages:[] }))
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
          .then(expectResponse({ messages:[] }))
          .then(() => expectMessageInDb('once-only'));
      });

      fit('should return within a reasonable time', function() {
        const start = Date.now();
        return postMessages(...oneHundredMessages())
          .then(response => {
            const end = Date.now();
            const maxMillis = 5;
            if(end > start + maxMillis) {
              const seconds = (end - start) / 1000;
              fail(`It took ${seconds}s to respond to the request.  The endpoint should respond within ${maxMillis}ms.`);
            }
            expect(response).toEqual({ messages:[] });
          });
      });

    });

    describe('for webapp-originating message processing', function() {

      it('should update message in DB when status update is received', function() {
        return saveWoMessage('abc-123', 'hello from webapp')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatus('abc-123', 'SENT'))
          .then(expectResponse({ messages:[] }))

          .then(() => expectMessageState('abc-123', 'sent'));
      });

      it('should update message multiple times when multiple status updates for the same message are received', function() {
        return saveWoMessage('abc-123', 'hello again')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatuses(
              { id:'abc-123', status:'SENT' },
              { id:'abc-123', status:'DELIVERED' }))
          .then(expectResponse({ messages:[] }))

          .then(() => expectMessageStates({ id:'abc-123', states:['sent', 'delivered'] }));
      });

      it('should not save a status update again if it\'s been seen before', function() {
        return saveWoMessage('abc-123', 'hello again')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatus('abc-123', 'SENT'))
          .then(expectResponse({ messages:[] }))
          .then(() => expectMessageStates({ id:'abc-123', states:['sent'] }))

          .then(() => postStatus('abc-123', 'SENT'))
          .then(expectResponse({ messages:[] }))
          .then(() => expectMessageStates({ id:'abc-123', states:['sent'] }));
      });

      fit('should return within a reasonable time', function() {
        return saveWoMessages(oneHundredWoMessages())
          .then(() => {

            const start = Date.now();
            return postStatuses(oneHundredUpdates())
              .then(response => {
                const end = Date.now();
                const maxMillis = 5;
                if(end > start + maxMillis) {
                  const seconds = (end - start) / 1000;
                  fail(`It took ${seconds}s to respond to the request.  The endpoint should respond within ${maxMillis}ms.`);
                }
                expect(response).toEqual({ messages:[] });
              })
              .then(() => expectMessageStates({ id:'abc-123', states:['sent * 100'] }))
          });
      });

    });

    it('should still save messages when a status update for an unknown message is received', function() {
        return saveWoMessage('abc-123', 'hello again')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatuses(
              { id:'abc-123', status:'SENT' },
              { id:'def-456', status:'DELIVERED' }))
          .then(expectResponse({ messages:[] }))
          .then(() => expectMessageStates({ id:'abc-123', states:['sent'] }))
    });

    it('should still save messages when an unrecognised status update is received', function() {
        return saveWoMessage('abc-123', 'hello again')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatus('abc-123', 'WTF'))
          .then(expectResponse({ messages:[] }))
          .then(() => expectMessageStates({ id:'abc-123', states:['unrecognised'] }))
    });

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

// TODO use bulkDocs for this
function saveWoMessages(...details) {
  return Promise.all(details.map(d => saveWoMessage(d.id, d.content)));
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

function oneHundredMessages() {
  const messages = [];
  let i;

  for(i=0; i<100; ++i) {
    messages.push({
      id: `test-message-${i}`,
      from: `+447890123${i}`,
      content: `message number ${i}`,
      sms_sent: 1520429025403 + (i * 2),
      sms_received: 1520429025403 + (i * 3),
    });
  }

  return messages;
}

function oneHundredWoMessages() {
  const messages = [];

  for(i=0; i<100; ++i) {
    messages.push({
      id: `wo-message-${i}`,
      content: `wo message ${i}`,
    });
  }

  return messages;
}

function oneHundredUpdates() {
  const STATUS = ['PENDING', 'SENT', 'DELIVERED', 'FAILED'];
  const updates = [];

  for(i=0; i<100; ++i) {
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
}
