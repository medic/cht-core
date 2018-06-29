const utils = require('../../../utils'),
      _ = require('underscore');

describe('non-unique-message-ids', () => {
  const docs = [
    {
      _id: 'doc1',
      type: 'data_record',
      form: 'a',
      contact: { _id: 'contact' },
      tasks: [{
        messages: [{ uuid: 'uuid', to: '1234', message: 'test' }],
        state: 'pending',
        state_history: [{ state: 'pending', timestamp: 1 }]
      }]
    }, {
      _id: 'doc2',
      type: 'data_record',
      form: 'a',
      contact: { _id: 'contact' },
      tasks: [{
        messages: [ { uuid: 'uuid', to: '4567', message: 'test2' } ], state: 'pending',
        state_history: [ { state: 'pending', timestamp: 1 } ]
      }]
    },
    {
      _id: 'doc3',
      type: 'data_record',
      form: 'a',
      contact: { _id: 'contact' },
      scheduled_tasks: [{
        messages: [{ uuid: 'uuid', to: '9874', message: 'test3' }],
        state: 'pending',
        state_history: [{ state: 'pending', timestamp: 1 }]
      }]
    }
  ];

  afterEach(() => utils.revertDb());

  const apiSmsRequest = {
    method: 'POST',
    path: '/api/sms',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' }
  };

  it('should set all pending messages to forwarded to gateway and update all documents', () => {
    return utils
      .saveDocs(docs)
      .then(results => {
        results.forEach((result, key) => docs[key]._rev = result.rev);

        return utils.request(apiSmsRequest);
      })
      .then(result => {
        expect(result.messages.length).toEqual(3);
        expect(result.messages).toEqual([
          { id: 'uuid', to: '1234', content: 'test' },
          { id: 'uuid', to: '4567', content: 'test2' },
          { id: 'uuid', to: '9874', content: 'test3' }
        ]);

        return Promise.all([
          utils.getDoc('doc1'),
          utils.getDoc('doc2'),
          utils.getDoc('doc3')
        ]);
      })
      .then(results => {
        // every one of these docs should receive a 'forwarded-to-gateway' status update
        expect(results.every(result => {
          if (parseInt(result._rev) !== 2) {
            return false;
          }

          if (result.tasks) {
            return result.tasks[0].state === 'forwarded-to-gateway' && result.tasks[0].state_history.length === 2;
          } else {
            return result.scheduled_tasks[0].state === 'forwarded-to-gateway' && result.scheduled_tasks[0].state_history.length === 2;
          }
        })).toEqual(true);
      });
  });

  it('instead, only one message gets a status update, and all docs are saved anyway, over and over', () => {
    docs.forEach(doc => {
      doc._id += 'bis';
      delete doc._rev;
    });

    return utils
      .saveDocs(docs)
      .then(results => {
        results.forEach((result, key) => docs[key]._rev = result.rev);

        return utils.request(apiSmsRequest);
      })
      .then(result => {
        expect(result.messages.length).toEqual(3);
        expect(result.messages).toEqual([
          { id: 'uuid', to: '1234', content: 'test' },
          { id: 'uuid', to: '4567', content: 'test2' },
          { id: 'uuid', to: '9874', content: 'test3' }
        ]);

        return Promise.all([
          utils.getDoc('doc1bis'),
          utils.getDoc('doc2bis'),
          utils.getDoc('doc3bis')
        ]);
      })
      .then(results => {
        // all docs are saved
        expect(results.every(result => parseInt(result._rev) === 2));

        // but only one doc's message receives 'forwarded-to-gateway'
        expect(results[0].tasks[0].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history.length).toEqual(2);
        expect(results[0].tasks[0].state_history[1].state).toEqual('forwarded-to-gateway');

        expect(results[1].tasks[0].state).toEqual('pending');
        expect(results[1].tasks[0].state_history.length).toEqual(1);

        expect(results[2].scheduled_tasks[0].state).toEqual('pending');
        expect(results[2].scheduled_tasks[0].state_history.length).toEqual(1);

        // simulate gateway actually sending `uuid` message and trying to update it's status
        const body = { updates: [{ id: 'uuid', status: 'SENT' }] };
        return utils.request(_.defaults({ body: JSON.stringify(body) }, apiSmsRequest));
      })
      .then(result => {
        // only one message got the status update!
        expect(result.messages.length).toEqual(2);
        expect(result.messages).toEqual([
          { id: 'uuid', to: '4567', content: 'test2' },
          { id: 'uuid', to: '9874', content: 'test3' }
        ]);

        return Promise.all([
          utils.getDoc('doc1bis'),
          utils.getDoc('doc2bis'),
          utils.getDoc('doc3bis')
        ]);
      })
      .then(results => {
        // all docs are saved
        expect(results.every(result => parseInt(result._rev) === 3));

        // but only one doc's message receives 'sent', which is immediately overwritten again
        expect(results[0].tasks[0].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history.length).toEqual(4);
        expect(results[0].tasks[0].state_history[1].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history[2].state).toEqual('sent');
        expect(results[0].tasks[0].state_history[3].state).toEqual('forwarded-to-gateway');

        expect(results[1].tasks[0].state).toEqual('pending');
        expect(results[1].tasks[0].state_history.length).toEqual(1);

        expect(results[2].scheduled_tasks[0].state).toEqual('pending');
        expect(results[2].scheduled_tasks[0].state_history.length).toEqual(1);

        // simulate gateway polling for messages again
        return utils.request(apiSmsRequest);
      })
      .then(result => {
        // surprise!! that 1st message appears again in this list
        expect(result.messages.length).toEqual(3);
        expect(result.messages).toEqual([
          { id: 'uuid', to: '4567', content: 'test2' },
          { id: 'uuid', to: '9874', content: 'test3' },
          { id: 'uuid', to: '1234', content: 'test' }
        ]);

        return Promise.all([
          utils.getDoc('doc1bis'),
          utils.getDoc('doc2bis'),
          utils.getDoc('doc3bis')
        ]);
      })
      .then(results => {
        // surprise!! that 1st message gets the `forwarded-to-gateway` status again
        // btw, all docs are saved on every request
        expect(results.every(result => parseInt(result._rev) === 4));

        // because the same status is no longer repeated, this change is not visible in the doc
        expect(results[0].tasks[0].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history.length).toEqual(4);
        expect(results[0].tasks[0].state_history[1].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history[2].state).toEqual('sent');
        expect(results[0].tasks[0].state_history[3].state).toEqual('forwarded-to-gateway');

        expect(results[1].tasks[0].state).toEqual('pending');
        expect(results[1].tasks[0].state_history.length).toEqual(1);

        expect(results[2].scheduled_tasks[0].state).toEqual('pending');
        expect(results[2].scheduled_tasks[0].state_history.length).toEqual(1);

        return utils.request(apiSmsRequest);
      })
      .then(result => {
        // surprise!! that 1st message appears again in this list
        expect(result.messages.length).toEqual(3);
        expect(result.messages).toEqual([
          { id: 'uuid', to: '4567', content: 'test2' },
          { id: 'uuid', to: '9874', content: 'test3' },
          { id: 'uuid', to: '1234', content: 'test' }
        ]);

        return Promise.all([
          utils.getDoc('doc1bis'),
          utils.getDoc('doc2bis'),
          utils.getDoc('doc3bis')
        ]);
      })
      .then(results => {
        // surprise!! that 1st message gets the `forwarded-to-gateway` status again
        // btw, all docs are saved on every request
        expect(results.every(result => parseInt(result._rev) === 5));

        // because the same status is no longer repeated, this change is not visible in the doc
        expect(results[0].tasks[0].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history.length).toEqual(4);
        expect(results[0].tasks[0].state_history[1].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history[2].state).toEqual('sent');
        expect(results[0].tasks[0].state_history[3].state).toEqual('forwarded-to-gateway');

        expect(results[1].tasks[0].state).toEqual('pending');
        expect(results[1].tasks[0].state_history.length).toEqual(1);

        expect(results[2].scheduled_tasks[0].state).toEqual('pending');
        expect(results[2].scheduled_tasks[0].state_history.length).toEqual(1);

        // simulate gateway actually sending `uuid` message and trying to update it's status
        const body = { updates: [{ id: 'uuid', status: 'SENT' }] };
        return utils.request(_.defaults({ body: JSON.stringify(body) }, apiSmsRequest));
      })
      .then(result => {
        expect(result.messages).toEqual([
          { id: 'uuid', to: '4567', content: 'test2' },
          { id: 'uuid', to: '9874', content: 'test3' }
        ]);

        return Promise.all([
          utils.getDoc('doc1bis'),
          utils.getDoc('doc2bis'),
          utils.getDoc('doc3bis')
        ]);
      })
      .then(results => {
        // surprise!! that 1st message gets the `forwarded-to-gateway` status again
        // btw, all docs are saved on every request
        expect(results.every(result => parseInt(result._rev) === 6));

        // because the same status is no longer repeated, this change is not visible in the doc
        expect(results[0].tasks[0].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history.length).toEqual(6);
        expect(results[0].tasks[0].state_history[1].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history[2].state).toEqual('sent');
        expect(results[0].tasks[0].state_history[3].state).toEqual('forwarded-to-gateway');
        expect(results[0].tasks[0].state_history[4].state).toEqual('sent');
        expect(results[0].tasks[0].state_history[5].state).toEqual('forwarded-to-gateway');

        expect(results[1].tasks[0].state).toEqual('pending');
        expect(results[1].tasks[0].state_history.length).toEqual(1);

        expect(results[2].scheduled_tasks[0].state).toEqual('pending');
        expect(results[2].scheduled_tasks[0].state_history.length).toEqual(1);
      });
  });
});
