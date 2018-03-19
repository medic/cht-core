const utils = require('../../../utils');
const uuid = require('uuid/v4');

const CHW_CONTACT_NUMBER = '+32049832049';

describe('/sms', function() {

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
      return allMessageDocs()
        .then(docs => docs.map(doc => {
          doc._deleted = true;
          return doc;
        }))
        .then(docs => utils.db.bulkDocs(docs));
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

      // TODO: performance tests should definitely happen, but they can't happen
      // on travis where we do not get to control performance characteristics
      // of build servers. Move this test into our testing suite once we
      // build it.
      // https://github.com/medic/medic-webapp/issues/4244
      // it('should return within a reasonable time', function() {
      //   return saveWoMessages(...oneHundredWoMessages())
      //     .then(() => {

      //       const start = Date.now();
      //       return postStatuses(...oneHundredUpdates())
      //         .then(response => {
      //           const end = Date.now();
      //           const maxMillis = 10000; // TODO a _reasonable_ time would hopefully be less than 1s, not less than 10!
      //           if(end > start + maxMillis) {
      //             const seconds = (end - start) / 1000;
      //             fail(`It took ${seconds}s to respond to the request.  The endpoint should respond within ${maxMillis}ms.`);
      //           }
      //           expect(response).toEqual({ messages:[] });
      //         })

      //         .then(() => getMessageStates())
      //         .then(states => {
      //           expect(states.length).toBe(100);

      //           // expect: 1 state update per message
      //           expect(
      //               states
      //                 .map(s => s.states)
      //                 .every(stateHistory => stateHistory.length === 1))
      //             .toBe(true);
      //         });
      //     });
      // });

    });

    it('should still save messages when a status update for an unknown message is received', function() {
        return saveWoMessage('abc-123', 'hello again')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatuses(
              { id:'abc-123', status:'SENT' },
              { id:'def-456', status:'DELIVERED' }))
          .then(expectResponse({ messages:[] }))
          .then(() => expectMessageStates({ id:'abc-123', states:['sent'] }));
    });

    it('should still save messages when an unrecognised status update is received', function() {
        return saveWoMessage('abc-123', 'hello again')
          .then(() => expectMessageWithoutState('abc-123'))

          .then(() => postStatus('abc-123', 'WTF'))
          .then(expectResponse({ messages:[] }))
          .then(() => expectMessageStates({ id:'abc-123', states:['unrecognised'] }));
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

function postMessages(...messages) {
  return post({ messages });
}

function expectResponse(expected) {
  return response => expect(response).toEqual(expected);
}

function expectMessagesInDb(...expectedContents) {
  expectedContents = JSON.stringify(expectedContents);

  return new Promise((resolve, reject) => {
    const endTime = Date.now() + 10000;

    check();

    function check() {
      getMessageContents()
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
    }
  });
}

function saveWoMessage(id, content) {
  return saveWoMessages({ id, content });
}

function saveWoMessages(...details) {
  return utils.db.bulkDocs(details.map(d => createWoMessage(d.id, d.content)));
}

function createWoMessage(id, content) {
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
    _id: uuid(),
    errors: [],
    form: null,
    from: '+123',
    reported_date: 1520416423761,
    tasks: [ task ],
    kujua_message: true,
    type: 'data_record',
    sent_by: 'some name',
  };

  return messageDoc;
}

function postStatus(messageId, newStatus) {
  return postStatuses({ id:messageId, status:newStatus });
}

function postStatuses(...updates) {
  return post({ updates });
}

function expectMessageWithoutState(id) {
  return expectMessagesWithoutState(id);
}

function expectMessagesWithoutState(...ids) {
  return expectMessageStates(...ids.map(id => ({ id })));
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
      getMessageStates()
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
    }
  });
}

function getMessageStates() {
  return allMessageDocs()
    .then(docs => docs.reduce((acc, doc) => {
      doc.tasks.forEach(task => task.messages.forEach(m => {
        const states = task.state_history &&
                       task.state_history.map(h => h.state);
        acc.push({ id:m.uuid, states });
      }));
      return acc;
    }, []));
}

function oneHundredWoMessages() {
  const messages = [];

  for(let i=0; i<100; ++i) {
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
}

function getMessageContents() {
  return allMessageDocs()
    .then(docs => docs.reduce((acc, doc) => {

      if(doc.kujua_message) {
        doc.tasks.forEach(task =>
            task.messages.forEach(m => acc.push(m.message)));
      }

      if(doc.sms_message) {
        acc.push(doc.sms_message.message);
      }

      return acc;
    }, []));
}

function allMessageDocs() {
  return utils.db.query('medic-client/messages_by_contact_date',
      { reduce:false, include_docs:true })
    .then(res => res.rows.map(row => row.doc));
}
