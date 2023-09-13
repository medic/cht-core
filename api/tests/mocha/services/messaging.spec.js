const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const taskUtils = require('@medic/task-utils');
const phoneNumber = require('@medic/phone-number');
const db = require('../../../src/db');
const config = require('../../../src/config');
const africasTalking = require('../../../src/services/africas-talking');
const rapidPro = require('../../../src/services/rapidpro');
const service = rewire('../../../src/services/messaging');
const records = require('../../../src/services/records');

describe('messaging service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('getOutgoingMessages', () => {

    it('returns errors', done => {
      const getView = sinon.stub(db.medic, 'query').returns(Promise.reject('bang'));
      service.getOutgoingMessages()
        .then(() => done('expected error to be thrown'))
        .catch(err => {
          chai.expect(err).to.equal('bang');
          chai.expect(getView.callCount).to.equal(1);
          done();
        });
    });

    it('queries for pending messages', () => {
      const query = sinon.stub(db.medic, 'query').resolves({ rows: [
        { key: 'yayaya', value: { id: 'a' } },
        { key: 'pending', value: { id: 'b' } },
        { key: 'pending', value: { id: 'c' } }
      ] });

      return service.getOutgoingMessages({ state: 'pending' }).then(messages => {
        chai.expect(query.callCount).to.equal(1);
        chai.expect(query.args[0][0]).to.equal('medic/messages_by_state');
        chai.expect(query.args[0][1]).to.deep.equal({
          limit: 25,
          startkey: [ 'pending-or-forwarded', 0 ],
          endkey: [ 'pending-or-forwarded', '\ufff0' ],
        });
        chai.expect(messages).to.deep.equal([ { id: 'a' }, { id: 'b'}, { id: 'c' } ]);
      });
    });

    it('normalizes phone numbers', () => {
      sinon.stub(db.medic, 'query').resolves({ rows: [
        { key: 'yayaya', value: { id: 'a', to: '123' } },
      ] });
      const normalize = sinon.stub(phoneNumber, 'normalize').returns('+64123');

      return service.getOutgoingMessages({ state: 'pending' }).then(messages => {
        chai.expect(messages).to.deep.equal([ { id: 'a', to: '+64123' } ]);
        chai.expect(normalize.callCount).to.equal(1);
        chai.expect(normalize.args[0][1]).to.equal('123');
      });
    });
  });

  describe('updateMessageTaskStates', () => {

    it('should do nothing when provided list is empty', () => {
      return service.updateMessageTaskStates([]).then((result) => {
        chai.expect(result).to.deep.equal({ saved: 0 });
      });
    });

    it('takes a collection of state changes and saves it to docs', () => {
      sinon.stub(db.medic, 'query').resolves({rows: [
        {id: 'testMessageId1'},
        {id: 'testMessageId2'},
      ]});

      sinon.stub(db.medic, 'allDocs').resolves({rows: [
        {doc: {
          _id: 'testDoc',
          tasks: [{
            messages: [{
              uuid: 'testMessageId1'
            }]
          }],
          scheduled_tasks: [{
            messages: [{
              uuid: 'testMessageId2'
            }]
          }]
        }}
      ]});

      const bulk = sinon.stub(db.medic, 'bulkDocs').resolves([]);
      const setTaskState = sinon.stub(taskUtils, 'setTaskState').returns(true);

      return service.updateMessageTaskStates([
        {
          messageId: 'testMessageId1',
          state: 'testState1',
        },
        {
          messageId: 'testMessageId2',
          state: 'testState2',
          details: 'Just because.',
          gatewayRef: '55997'
        }
      ]).then(() => {
        chai.expect(setTaskState.callCount).to.equal(2);
        chai.expect(setTaskState.getCall(0).args)
          .to.deep.equal([{ messages: [{uuid: 'testMessageId1'}]}, 'testState1', undefined, undefined]);
        chai.expect(setTaskState.getCall(1).args)
          .to.deep.equal([{ messages: [{uuid: 'testMessageId2'}]}, 'testState2', 'Just because.', '55997']);

        const doc = bulk.args[0][0][0];
        chai.expect(doc._id).to.equal('testDoc');
      });
    });

    it('uses gatewayRef to find messageId', () => {
      const gatewayRef1 = '55993';
      const gatewayRef2 = '55997';
      const messageId1 = 'testMessageId1';
      const messageId2 = 'testMessageId2';
      sinon.stub(db.medic, 'query')
        .onCall(0)
        .resolves({ rows: [{ key: gatewayRef1, value: messageId1 }, { key: gatewayRef2, value: messageId2 }] })
        .onCall(1).resolves({ rows: [{ id: messageId1 }, { id: messageId2 }]});
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        {
          doc: {
            _id: 'testDoc',
            tasks: [{ messages: [{ uuid: messageId1, gateway_ref: gatewayRef1 }] }],
            scheduled_tasks: [{ messages: [{ uuid: messageId2, gateway_ref: gatewayRef2 }] }]
          }
        }
      ]});

      const bulk = sinon.stub(db.medic, 'bulkDocs').resolves([]);
      const setTaskState = sinon.stub(taskUtils, 'setTaskState').returns(true);

      return service.updateMessageTaskStates([
        { gatewayRef: gatewayRef1, state: 'testState1', },
        { gatewayRef: gatewayRef2, state: 'testState2', details: 'Just because.', }
      ]).then(() => {
        chai.expect(setTaskState.callCount).to.equal(2);
        chai.expect(setTaskState.getCall(0).args).to.deep.equal(
          [{ messages: [{ uuid: messageId1, gateway_ref: gatewayRef1 }]}, 'testState1', undefined, gatewayRef1 ]
        );
        chai.expect(setTaskState.getCall(1).args).to.deep.equal(
          [{ messages: [{ uuid: messageId2, gateway_ref: gatewayRef2 }]}, 'testState2', 'Just because.', gatewayRef2 ]
        );

        const doc = bulk.args[0][0][0];
        chai.expect(doc._id).to.equal('testDoc');

        chai.expect(db.medic.query.callCount).to.equal(2);
        chai.expect(db.medic.query.args[0][0]).to.equal('medic-sms/messages_by_gateway_ref');
        chai.expect(db.medic.query.args[0][1]).to.deep.equal({ keys: [ gatewayRef1, gatewayRef2 ] });
      });
    });

    it('DOES NOT throw an error if it cannot find the message', () => {
      sinon.stub(db.medic, 'query').resolves({rows: [
        { id: 'testMessageId1' },
      ]});

      sinon.stub(db.medic, 'allDocs').resolves({rows: [
        {doc: {
          _id: 'testDoc',
          tasks: [{
            messages: [{
              uuid: 'testMessageId1'
            }]
          }]
        }}
      ]});

      const bulk = sinon.stub(db.medic, 'bulkDocs').resolves([]);

      return service.updateMessageTaskStates([
        {
          messageId: 'testMessageId1',
          state: 'testState1',
        },
        {
          messageId: 'testMessageId2',
          state: 'testState2',
          details: 'Just because.'
        }
      ]).then(() => {
        chai.expect(bulk.callCount).to.equal(1);
      });
    });

    it('re-applies changes if it errored', () => {
      const view = sinon.stub(db.medic, 'query')
        .onFirstCall().resolves({rows: [
          {id: 'testMessageId1'},
          {id: 'testMessageId2'},
        ]})
        .onSecondCall().resolves({rows: [
          {id: 'testMessageId2'},
        ]});

      sinon.stub(db.medic, 'allDocs')
        .onFirstCall().resolves({rows: [
          {doc: {
            _id: 'testDoc',
            tasks: [{
              messages: [{
                uuid: 'testMessageId1'
              }]
            }]
          }},
          {doc: {
            _id: 'testDoc2',
            tasks: [{
              messages: [{
                uuid: 'testMessageId2'
              }]
            }]
          }}
        ]})
        .onSecondCall().resolves({rows: [
          {doc: {
            _id: 'testDoc2',
            tasks: [{
              messages: [{
                uuid: 'testMessageId2'
              }]
            }]
          }}
        ]});

      const bulk = sinon.stub(db.medic, 'bulkDocs')
        .onFirstCall().resolves([
          {id: 'testDoc', ok: true},
          {id: 'testDoc2', error: 'oh no!'},
        ])
        .onSecondCall().resolves([
          {id: 'testDoc2', ok: true},
        ]);

      return service.updateMessageTaskStates([
        {
          messageId: 'testMessageId1',
          state: 'testState1',
        },
        {
          messageId: 'testMessageId2',
          state: 'testState2',
          details: 'Just because.'
        }
      ]).then(() => {
        chai.expect(view.callCount).to.equal(2);
        chai.expect(view.args[0][1]).to.deep.equal({keys: ['testMessageId1', 'testMessageId2']});
        chai.expect(view.args[1][1]).to.deep.equal({keys: ['testMessageId2']});

        chai.expect(bulk.args[0][0].length).to.equal(2);
        chai.expect(bulk.args[0][0][0]._id).to.equal('testDoc');
        chai.expect(bulk.args[0][0][1]._id).to.equal('testDoc2');
        chai.expect(bulk.args[1][0].length).to.equal(1);
        chai.expect(bulk.args[1][0][0]._id).to.equal('testDoc2');
      });
    });

    it('does not save docs which have not received any updates', () => {

      sinon.stub(db.medic, 'query').resolves({rows: [
        {id: 'testMessageId1'},
        {id: 'testMessageId2'},
        {id: 'testMessageId3'},
        {id: 'testMessageId4'},
        {id: 'testMessageId5'},
        {id: 'testMessageId6'}
      ]});

      sinon.stub(db.medic, 'allDocs').resolves({rows: [
        {
          doc: {
            _id: 'testDoc',
            tasks: [{
              messages: [{
                uuid: 'testMessageId1'
              }]
            }],
            scheduled_tasks: [{
              messages: [{
                uuid: 'testMessageId2'
              }]
            }]
          }
        },
        {
          doc: {
            _id: 'testDoc2',
            tasks: [{
              messages: [{
                uuid: 'testMessageId3',
              }]
            }],
            scheduled_tasks: [{
              messages: [{
                uuid: 'testMessageId4'
              }]
            }]
          }
        },
        {
          doc: {
            _id: 'testDoc3',
            tasks: [{
              messages: [{
                uuid: 'testMessageId5',
              }]
            }],
            scheduled_tasks: [{
              messages: [{
                uuid: 'testMessageId6'
              }]
            }]
          }
        }
      ]});

      const bulk = sinon.stub(db.medic, 'bulkDocs').resolves([
        { ok: true, id: 'testDoc' },
        { ok: true, id: 'testDoc2' },
      ]);
      const setTaskState = sinon.stub(taskUtils, 'setTaskState');
      setTaskState
        .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId1' }]})).returns(true)   //testDoc
        .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId2' }]})).returns(false)  //testDoc
        .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId3' }]})).returns(false)  //testDoc2
        .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId4' }]})).returns(true)   //testDoc2
        .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId5' }]})).returns(false)  //testDoc3
        .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId6' }]})).returns(false); //testDoc3

      return service.updateMessageTaskStates([
        { messageId: 'testMessageId1', state: 'state' },
        { messageId: 'testMessageId2', state: 'state' },
        { messageId: 'testMessageId3', state: 'state' },
        { messageId: 'testMessageId4', state: 'state' },
        { messageId: 'testMessageId5', state: 'state' },
        { messageId: 'testMessageId6', state: 'state' }
      ]).then(actual => {
        chai.expect(setTaskState.callCount).to.equal(6);
        chai.expect(setTaskState.args[0])
          .to.deep.equal([{ messages: [{uuid: 'testMessageId1'}]}, 'state', undefined, undefined]);
        chai.expect(setTaskState.args[1])
          .to.deep.equal([{ messages: [{uuid: 'testMessageId2'}]}, 'state', undefined, undefined]);
        chai.expect(setTaskState.args[2])
          .to.deep.equal([{ messages: [{uuid: 'testMessageId3'}]}, 'state', undefined, undefined]);
        chai.expect(setTaskState.args[3])
          .to.deep.equal([{ messages: [{uuid: 'testMessageId4'}]}, 'state', undefined, undefined]);
        chai.expect(setTaskState.args[4])
          .to.deep.equal([{ messages: [{uuid: 'testMessageId5'}]}, 'state', undefined, undefined]);
        chai.expect(setTaskState.args[5])
          .to.deep.equal([{ messages: [{uuid: 'testMessageId6'}]}, 'state', undefined, undefined]);

        chai.expect(bulk.args[0][0].length).to.equal(2);
        chai.expect(bulk.args[0][0][0]._id).to.equal('testDoc');
        chai.expect(bulk.args[0][0][1]._id).to.equal('testDoc2');

        chai.expect(actual).to.deep.equal({ saved: 2 });
      });
    });

  });

  describe('send', () => {

    it('does nothing if no outgoing message service configured', () => {
      sinon.stub(db.medic, 'get');
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'none' });
      return service.send('abc').then(() => {
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(0);
      });
    });

    it('does nothing if doc has no pending messages', () => {
      const doc = {
        tasks: [{
          state: 'sent',
          messages: [{
            uuid: 'a',
            to: '+123',
            message: 'hello',
          }]
        }],
        scheduled_tasks: [{
          state: 'scheduled',
          messages: [{
            uuid: 'a',
            to: '+123',
            message: 'hello',
          }]
        }]
      };
      sinon.stub(db.medic, 'get').resolves(doc);
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'africas-talking' });
      return service.send('abc').then(() => {
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0][0]).to.equal('abc');
      });
    });

    it('does not update state if sending fails', () => {
      const doc = {
        scheduled_tasks: [{
          state: 'pending',
          messages: [{
            uuid: 'a',
            to: '+123',
            message: 'hello',
          }]
        }]
      };
      sinon.stub(db.medic, 'get').resolves(doc);
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'africas-talking' });
      sinon.stub(africasTalking, 'send').resolves([]);
      sinon.stub(service, 'updateMessageTaskStates');
      return service.send('abc').then(() => {
        chai.expect(africasTalking.send.callCount).to.equal(1);
        chai.expect(africasTalking.send.args[0][0]).to.deep.equal([ { id: 'a', to: '+123', content: 'hello' } ]);
        chai.expect(service.updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(service.updateMessageTaskStates.args[0]).to.deep.equal([[]]);
      });
    });

    it('does not update state if sending fails', () => {
      const doc = {
        tasks: [{
          state: 'pending',
          messages: [{
            uuid: 'a',
            to: '+123',
            message: 'hello',
          }]
        }],
        scheduled_tasks: [{
          state: 'pending',
          messages: [{
            uuid: 'b',
            to: '+321',
            message: 'bye',
          }]
        }]
      };
      sinon.stub(db.medic, 'get').resolves(doc);
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'africas-talking' });
      sinon.stub(africasTalking, 'send').resolves([
        { messageId: 'a', state: 'sent', gateway_ref: '123' },
        { messageId: 'b', state: 'received_by_gateway', gateway_ref: '456' },
      ]);
      sinon.stub(service, 'updateMessageTaskStates');
      return service.send('abc').then(() => {
        chai.expect(service.updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(service.updateMessageTaskStates.args[0][0]).to.deep.equal([
          { messageId: 'a', state: 'sent', gateway_ref: '123' },
          { messageId: 'b', state: 'received_by_gateway', gateway_ref: '456' },
        ]);
      });
    });

  });

  describe('checkDbForMessagesToSend', () => {
    service._checkDbForMessagesToSend = service.__get__('checkDbForMessagesToSend');

    it('does nothing if no outgoing message service configured', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'none' });
      sinon.stub(service, 'getOutgoingMessages');
      return service._checkDbForMessagesToSend().then(() => {
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(service.getOutgoingMessages.callCount).to.equal(0);
      });
    });

    it('does nothing with default settings (medic-gateway)', () => {
      sinon.stub(config, 'get').withArgs('sms').returns();
      sinon.stub(service, 'getOutgoingMessages');
      return service._checkDbForMessagesToSend().then(() => {
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(service.getOutgoingMessages.callCount).to.equal(0);
      });
    });

    it('does nothing if there are no messages to send', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'africas-talking' });
      sinon.stub(service, 'getOutgoingMessages').resolves([]);
      sinon.stub(africasTalking, 'send');
      return service._checkDbForMessagesToSend().then(() => {
        chai.expect(service.getOutgoingMessages.callCount).to.equal(1);
        chai.expect(africasTalking.send.callCount).to.equal(0);
      });
    });

    it('does nothing if there are no messages to send with rapidPro', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'rapidpro' });
      sinon.stub(service, 'getOutgoingMessages').resolves([]);
      sinon.stub(rapidPro, 'send');
      sinon.stub(africasTalking, 'send');
      return service._checkDbForMessagesToSend().then(() => {
        chai.expect(service.getOutgoingMessages.callCount).to.equal(1);
        chai.expect(rapidPro.send.callCount).to.equal(0);
        chai.expect(africasTalking.send.callCount).to.equal(0);
      });
    });

    it('passes the messages to the configured service and ignores failures', () => {
      const outgoingMessages = [ { id: 'a', to: '+123', content: 'hello' } ];
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'africas-talking' });
      sinon.stub(service, 'getOutgoingMessages').resolves(outgoingMessages);
      sinon.stub(africasTalking, 'send').resolves([]);
      sinon.stub(rapidPro, 'send');
      sinon.stub(service, 'updateMessageTaskStates');
      return service._checkDbForMessagesToSend().then(() => {
        chai.expect(rapidPro.send.callCount).to.equal(0);
        chai.expect(africasTalking.send.callCount).to.equal(1);
        chai.expect(africasTalking.send.args[0][0]).to.deep.equal(outgoingMessages);
        chai.expect(service.updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(service.updateMessageTaskStates.args[0]).to.deep.equal([[]]);
      });
    });

    it('passes the messages to the configured service and ignores failures with RapidPro', () => {
      const outgoingMessages = [ { id: 'a', to: '+123', content: 'hello' } ];
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'rapidpro' });
      sinon.stub(service, 'getOutgoingMessages').resolves(outgoingMessages);
      sinon.stub(rapidPro, 'send').resolves([]);
      sinon.stub(africasTalking, 'send');
      sinon.stub(service, 'updateMessageTaskStates');
      return service._checkDbForMessagesToSend().then(() => {
        chai.expect(africasTalking.send.callCount).to.equal(0);
        chai.expect(rapidPro.send.callCount).to.equal(1);
        chai.expect(rapidPro.send.args[0][0]).to.deep.equal(outgoingMessages);
        chai.expect(service.updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(service.updateMessageTaskStates.args[0]).to.deep.equal([[]]);
      });
    });

    it('passes the messages to the configured service and updates state', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'africas-talking' });
      sinon.stub(service, 'getOutgoingMessages').resolves([
        { id: 'a', to: '+123', content: 'hello' },
        { id: 'b', to: '+456', content: 'bye' }
      ]);
      sinon.stub(africasTalking, 'send').resolves([
        { messageId: 'a', state: 'failed' },
        { messageId: 'b', state: 'recieved-by-gateway', gatewayRef: 'xyz' },
      ]);
      sinon.stub(service, 'updateMessageTaskStates');
      return service._checkDbForMessagesToSend().then(() => {
        chai.expect(service.updateMessageTaskStates.callCount).to.equal(1);
        chai.expect(service.updateMessageTaskStates.args[0][0]).to.deep.equal([
          {
            messageId: 'a',
            state: 'failed'
          },
          {
            messageId: 'b',
            state: 'recieved-by-gateway',
            gatewayRef: 'xyz',
          }
        ]);
      });
    });

  });

  describe('checkDbForMessagesToUpdate', () => {
    service._checkDbForMessagesToUpdate = service.__get__('checkDbForMessagesToUpdate');

    it('does nothing if no outgoing message service configured', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'none' });
      sinon.stub(rapidPro, 'poll');
      return service._checkDbForMessagesToUpdate().then(() => {
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(rapidPro.poll.callCount).to.equal(0);
      });
    });

    it('does nothing with default settings (medic-gateway)', () => {
      sinon.stub(config, 'get').withArgs('sms').returns();
      sinon.stub(rapidPro, 'poll');
      return service._checkDbForMessagesToUpdate().then(() => {
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(rapidPro.poll.callCount).to.equal(0);
      });
    });

    it('does nothing if the outgoing message service doesn\'t support polling', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'africas-talking' });
      sinon.stub(rapidPro, 'poll');
      return service._checkDbForMessagesToUpdate().then(() => {
        chai.expect(rapidPro.poll.callCount).to.equal(0);
      });
    });

    it('calls outgoing message service poll method', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'rapidpro' });
      sinon.stub(rapidPro, 'poll').resolves();
      return service._checkDbForMessagesToUpdate().then(() => {
        chai.expect(rapidPro.poll.callCount).to.equal(1);
      });
    });
  });

  describe('processIncomingMessages', () => {

    it('does nothing when given nothing', () => {
      const query = sinon.stub(db.medic, 'query');
      return service.processIncomingMessages().then(() => {
        chai.expect(query.callCount).to.equal(0);
      });
    });

    it('does nothing when given no valid messages', () => {
      const query = sinon.stub(db.medic, 'query').resolves({ rows: [ { key: 'seen' } ] });
      const given = [ { content: 'abc', from: '+123' } ]; // no id
      return service.processIncomingMessages(given).then(() => {
        chai.expect(query.callCount).to.equal(0);
      });
    });

    it('does nothing when the messages have been seen before', () => {
      const query = sinon.stub(db.medic, 'query').resolves({ rows: [ { key: 'seen' } ] });
      const given = [ { id: 'seen', content: 'abc', from: '+123' } ];
      const createRecord = sinon.stub(records, 'createByForm');
      return service.processIncomingMessages(given).then(() => {
        chai.expect(query.callCount).to.equal(1);
        chai.expect(query.args[0][0]).to.equal('medic-sms/messages_by_gateway_ref');
        chai.expect(query.args[0][1]).to.deep.equal({ keys: [ 'seen' ] });
        chai.expect(createRecord.callCount).to.equal(0);
      });
    });

    it('saves WT messages to DB', () => {
      const createRecord = sinon.stub(records, 'createByForm')
        .onCall(0).returns({ message: 'one' })
        .onCall(1).returns({ message: 'two' })
        .onCall(2).returns({ message: 'three' });

      sinon.stub(db.medic, 'query').resolves({ offset: 0, total_rows: 0, rows: [] });

      const transitionsLib = {
        processDocs: sinon.stub().resolves([
          { ok: true, id: 'id' },
          { ok: true, id: 'id' },
          { ok: true, id: 'id' }
        ])
      };
      sinon.stub(config, 'getTransitionsLib').returns(transitionsLib);

      const given = [
        { id: '1', from: '+1', content: 'one'   },
        { id: '2', from: '+2', content: 'two'   },
        { id: '3', from: '+3', content: 'three' },
      ];

      return service.processIncomingMessages(given).then(actual => {
        chai.expect(createRecord.callCount).to.equal(3);
        chai.expect(createRecord.args[0][0]).to.deep.equal({ gateway_ref: '1', from: '+1', message: 'one'   });
        chai.expect(createRecord.args[1][0]).to.deep.equal({ gateway_ref: '2', from: '+2', message: 'two'   });
        chai.expect(createRecord.args[2][0]).to.deep.equal({ gateway_ref: '3', from: '+3', message: 'three' });
        chai.expect(transitionsLib.processDocs.callCount).to.equal(1);
        chai.expect(transitionsLib.processDocs.args[0]).to.deep.equal([[
          { message: 'one' },
          { message: 'two' },
          { message: 'three' }
        ]]);
        chai.expect(actual).to.deep.equal({ saved: 3 });
      });
    });

  });

  describe('isMedicGatewayEnabled', () => {

    it('returns false when not configured', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'none' });
      chai.expect(service.isMedicGatewayEnabled()).to.equal(false);
    });

    it('returns true when configured', () => {
      sinon.stub(config, 'get').withArgs('sms').returns({ outgoing_service: 'medic-gateway' });
      chai.expect(service.isMedicGatewayEnabled()).to.equal(true);
    });

    it('defaults to true', () => {
      sinon.stub(config, 'get').withArgs('sms').returns();
      chai.expect(service.isMedicGatewayEnabled()).to.equal(true);
    });

  });

});
