const chai = require('chai'),
      sinon = require('sinon'),
      taskUtils = require('task-utils'),
      db = require('../../src/db-pouch'),
      controller = require('../../src/message-utils');

describe('message utils', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('getMessages returns errors', done => {
    const getView = sinon.stub(db.medic, 'query').callsArgWith(2, 'bang');
    controller.getMessages(null, function(err) {
      chai.expect(err).to.equal('bang');
      chai.expect(getView.callCount).to.equal(1);
      done();
    });
  });

  it('getMessages passes limit param value of 100 to view', done => {
    const getView = sinon.stub(db.medic, 'query').callsArgWith(2, null, { rows: [] });
    controller.getMessages({ limit: 500 }, function() {
      chai.expect(getView.callCount).to.equal(1);
      // assert query parameters on view call use right limit value
      chai.expect({ limit: 500 }).to.deep.equal(getView.getCall(0).args[1]);
      done();
    });
  });

  it('getMessages returns 500 error if limit over 100', done => {
    const getView = sinon.stub(db.medic, 'query');
    controller.getMessages({ limit: 9999 }, function(err) {
      chai.expect(err.code).to.equal(500);
      chai.expect(err.message).to.equal('Limit max is 1000');
      chai.expect(getView.callCount).to.equal(0);
      done();
    });
  });

  it('getMessages passes state param', done => {
    sinon.stub(db.medic, 'query').callsArgWith(2, null, { rows: [
      { key: 'yayaya', value: { sending_due_date: 456 } },
      { key: 'pending', value: { sending_due_date: 123 } },
      { key: 'pending', value: { sending_due_date: 789 } }
    ] });

    controller.getMessages({}, function(err, messages) {
      chai.expect(err).to.equal(null);
      chai.expect(messages.length).to.equal(3);
      chai.expect(messages[0].sending_due_date).to.be.lessThan(messages[1].sending_due_date);
      chai.expect(messages[1].sending_due_date).to.be.lessThan(messages[2].sending_due_date);
      done();
    });
  });

  it('getMessages passes states param', done => {
    const getView = sinon.stub(db.medic, 'query').callsArgWith(2, null, { rows: [] });
    controller.getMessages({ states: ['happy', 'angry'] }, function(err) {
      chai.expect(err).to.equal(null);
      chai.expect(getView.callCount).to.equal(1);
      chai.expect(['happy', 'angry']).to.deep.equal(getView.getCall(0).args[1].keys);
      done();
    });
  });

  it('getMessages sorts results', done => {
    const getView = sinon.stub(db.medic, 'query').callsArgWith(2, null, { rows: [] });
    controller.getMessages({ states: ['happy', 'angry'] }, function(err) {
      chai.expect(err).to.equal(null);
      chai.expect(getView.callCount).to.equal(1);
      chai.expect(['happy', 'angry']).to.deep.equal(getView.getCall(0).args[1].keys);
      done();
    });
  });

  it('updateMessageTaskStates takes a collection of state changes and saves it to docs', done => {
    sinon.stub(db.medic, 'query').callsArgWith(2, null, {rows: [
      {id: 'testMessageId1'},
      {id: 'testMessageId2'}]});

    sinon.stub(db.medic, 'allDocs').callsArgWith(1, null, {rows: [
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

    const bulk = sinon.stub(db.medic, 'bulkDocs').callsArgWith(1, null, []);
    const setTaskState = sinon.stub(taskUtils, 'setTaskState').returns(true);

    controller.updateMessageTaskStates([
      {
        messageId: 'testMessageId1',
        state: 'testState1',
      },
      {
        messageId: 'testMessageId2',
        state: 'testState2',
        details: 'Just because.'
      }
    ], (err, result) => {
      chai.expect(err).to.equal(null);
      chai.expect(result).to.deep.equal({success: true});
      chai.expect(setTaskState.callCount).to.equal(2);
      chai.expect(setTaskState.getCall(0).args).to.deep.equal([{ messages: [{uuid: 'testMessageId1'}]}, 'testState1', undefined]);
      chai.expect(setTaskState.getCall(1).args).to.deep.equal([{ messages: [{uuid: 'testMessageId2'}]}, 'testState2', 'Just because.']);

      const doc = bulk.args[0][0][0];
      chai.expect(doc._id).to.equal('testDoc');

      done();
    });
  });

  it('updateMessageTaskStates DOES NOT throw an error if it cant find the message', done => {
    sinon.stub(db.medic, 'query').callsArgWith(2, null, {rows: [
      {id: 'testMessageId1'}]});

    sinon.stub(db.medic, 'allDocs').callsArgWith(1, null, {rows: [
      {doc: {
        _id: 'testDoc',
        tasks: [{
          messages: [{
            uuid: 'testMessageId1'
          }]
        }]
      }}
    ]});

    sinon.stub(db.medic, 'bulkDocs').callsArgWith(1, null, []);

    controller.updateMessageTaskStates([
      {
        messageId: 'testMessageId1',
        state: 'testState1',
      },
      {
        messageId: 'testMessageId2',
        state: 'testState2',
        details: 'Just because.'
      }
    ], (err, result) => {
      chai.expect(err).to.equal(null);
      chai.expect(result).to.deep.equal({success: true});
      done();
    });
  });

  it('updateMessageTaskStates re-applies changes if it errored', done => {
    const view = sinon.stub(db.medic, 'query')
    .onFirstCall().callsArgWith(2, null, {rows: [
      {id: 'testMessageId1'},
      {id: 'testMessageId2'}]})
    .onSecondCall().callsArgWith(2, null, {rows: [
      {id: 'testMessageId2'}]});

    sinon.stub(db.medic, 'allDocs')
    .onFirstCall().callsArgWith(1, null, {rows: [
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
    .onSecondCall().callsArgWith(1, null, {rows: [
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
    .onFirstCall().callsArgWith(1, null, [
      {id: 'testDoc', ok: true},
      {id: 'testDoc2', error: 'oh no!'}])
    .onSecondCall().callsArgWith(1, null, [
      {id: 'testDoc2', ok: true}]);

    controller.updateMessageTaskStates([
      {
        messageId: 'testMessageId1',
        state: 'testState1',
      },
      {
        messageId: 'testMessageId2',
        state: 'testState2',
        details: 'Just because.'
      }
    ], (err, result) => {
      chai.expect(err).to.equal(null);
      chai.expect(result).to.deep.equal({success: true});

      chai.expect(view.callCount).to.equal(2);
      chai.expect(view.args[0][1]).to.deep.equal({keys: ['testMessageId1', 'testMessageId2']});
      chai.expect(view.args[1][1]).to.deep.equal({keys: ['testMessageId2']});

      chai.expect(bulk.args[0][0].length).to.equal(2);
      chai.expect(bulk.args[0][0][0]._id).to.equal('testDoc');
      chai.expect(bulk.args[0][0][1]._id).to.equal('testDoc2');
      chai.expect(bulk.args[1][0].length).to.equal(1);
      chai.expect(bulk.args[1][0][0]._id).to.equal('testDoc2');

      done();
    });
  });

  it('does not save docs which have not received any updates', done => {

    sinon.stub(db.medic, 'query').callsArgWith(2, null, {rows: [
      {id: 'testMessageId1'},
      {id: 'testMessageId2'},
      {id: 'testMessageId3'},
      {id: 'testMessageId4'},
      {id: 'testMessageId5'},
      {id: 'testMessageId6'}
    ]});

    sinon.stub(db.medic, 'allDocs').callsArgWith(1, null, {rows: [
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

    const bulk = sinon.stub(db.medic, 'bulkDocs').callsArgWith(1, null, []);
    const setTaskState = sinon.stub(taskUtils, 'setTaskState');
    setTaskState
      .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId1' }]})).returns(true)   //testDoc
      .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId2' }]})).returns(false)  //testDoc
      .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId3' }]})).returns(false)  //testDoc2
      .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId4' }]})).returns(true)   //testDoc2
      .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId5' }]})).returns(false)  //testDoc3
      .withArgs(sinon.match({ messages: [{ uuid: 'testMessageId6' }]})).returns(false); //testDoc3

    controller.updateMessageTaskStates([
      { messageId: 'testMessageId1', state: 'state' },
      { messageId: 'testMessageId2', state: 'state' },
      { messageId: 'testMessageId3', state: 'state' },
      { messageId: 'testMessageId4', state: 'state' },
      { messageId: 'testMessageId5', state: 'state' },
      { messageId: 'testMessageId6', state: 'state' }
    ], (err, result) => {
      chai.expect(err).to.equal(null);
      chai.expect(result).to.deep.equal({success: true});

      chai.expect(setTaskState.callCount).to.equal(6);
      chai.expect(setTaskState.args[0]).to.deep.equal([{ messages: [{uuid: 'testMessageId1'}]}, 'state', undefined]);
      chai.expect(setTaskState.args[1]).to.deep.equal([{ messages: [{uuid: 'testMessageId2'}]}, 'state', undefined]);
      chai.expect(setTaskState.args[2]).to.deep.equal([{ messages: [{uuid: 'testMessageId3'}]}, 'state', undefined]);
      chai.expect(setTaskState.args[3]).to.deep.equal([{ messages: [{uuid: 'testMessageId4'}]}, 'state', undefined]);
      chai.expect(setTaskState.args[4]).to.deep.equal([{ messages: [{uuid: 'testMessageId5'}]}, 'state', undefined]);
      chai.expect(setTaskState.args[5]).to.deep.equal([{ messages: [{uuid: 'testMessageId6'}]}, 'state', undefined]);

      chai.expect(bulk.args[0][0].length).to.equal(2);
      chai.expect(bulk.args[0][0][0]._id).to.equal('testDoc');
      chai.expect(bulk.args[0][0][1]._id).to.equal('testDoc2');

      done();
    });
  });

});
