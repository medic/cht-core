const chai = require('chai'),
      controller = require('../../../src/controllers/sms-gateway'),
      messageUtils = require('../../../src/message-utils'),
      recordUtils = require('../../../src/controllers/record-utils'),
      db = require('../../../src/db-pouch'),
      sinon = require('sinon');

describe('sms-gateway controller', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('get() should report sms-gateway compatibility', () => {
    const results = controller.get();
    chai.expect(results['medic-gateway']).to.equal(true);
  });

  it('post() should save WT messages to DB', done => {
    // given
    const createRecord = sinon.stub(recordUtils, 'createByForm')
      .onCall(0).returns({ message: 'one' })
      .onCall(1).returns({ message: 'two' })
      .onCall(2).returns({ message: 'three' });
    const bulkDocs = sinon.stub(db.medic, 'bulkDocs').returns(Promise.resolve([ { ok: true, id: 'some-id' } ]));
    const getMessages = sinon.stub(messageUtils, 'getMessages').callsArgWith(1, null, []);
    const updateMessageTaskStates = sinon.stub(messageUtils, 'updateMessageTaskStates');
    updateMessageTaskStates.callsArgWith(1, null, {});

    sinon.stub(db.medic, 'query')
        .returns(Promise.resolve({ offset:0, total_rows:0, rows:[] }));

    const req = { body: {
      messages: [
        { id:'1', from:'+1', content:'one'   },
        { id:'2', from:'+2', content:'two'   },
        { id:'3', from:'+3', content:'three' },
      ]
    } };

    // when
    controller.post(req).then(() => {
      // then
      chai.expect(getMessages.callCount).to.equal(1);
      chai.expect(createRecord.callCount).to.equal(3);
      chai.expect(createRecord.args[0][0]).to.deep.equal({ gateway_ref: '1', from: '+1', message: 'one'   });
      chai.expect(createRecord.args[1][0]).to.deep.equal({ gateway_ref: '2', from: '+2', message: 'two'   });
      chai.expect(createRecord.args[2][0]).to.deep.equal({ gateway_ref: '3', from: '+3', message: 'three' });
      chai.expect(bulkDocs.callCount).to.equal(1);
      chai.expect(bulkDocs.args[0][0]).to.deep.equal([
        { message: 'one' },
        { message: 'two' },
        { message: 'three' }
      ]);
      done();
    });
  });

  it('post() should update statuses supplied in request', done => {
    // given
    const updateMessageTaskStates = sinon.stub(messageUtils, 'updateMessageTaskStates');
    updateMessageTaskStates.callsArgWith(1, null, {});

    sinon.stub(messageUtils, 'getMessages').callsArgWith(1, null, []);

    const req = { body: {
      updates: [
        { id:'1', status:'UNSENT' },
        { id:'2', status:'PENDING' },
        { id:'3', status:'SENT' },
        { id:'4', status:'DELIVERED' },
        { id:'5', status:'FAILED', reason:'bad' },
      ],
    } };
    // when
    controller.post(req).then(() => {
      // then
      chai.expect(updateMessageTaskStates.args[0][0]).to.deep.equal([
        { messageId: '1', state:'received-by-gateway' },
        { messageId: '2', state:'forwarded-by-gateway'},
        { messageId: '3', state:'sent' },
        { messageId: '4', state:'delivered' },
        { messageId: '5', state:'failed', details:{ reason:'bad' } },
      ]);
      done();
    });
  });

  it('post() should persist unknown statuses', done => {
    // given
    const updateMessageTaskStates = sinon.stub(messageUtils, 'updateMessageTaskStates');
    updateMessageTaskStates.callsArgWith(1, null, {});

    sinon.stub(messageUtils, 'getMessages').callsArgWith(1, null, []);

    const req = { body: {
      updates: [
        { id:'1', status:'INVENTED-1' },
        { id:'2', status:'INVENTED-2' },
      ],
    } };

    // when
    controller.post(req).then(() => {
      // then
      chai.expect(updateMessageTaskStates.args[0][0]).to.deep.equal([
        { messageId: '1', state:'unrecognised', details:{ gateway_status:'INVENTED-1' }},
        { messageId: '2', state:'unrecognised', details:{ gateway_status:'INVENTED-2' }},
      ]);
      done();
    });
  });

  it('post() should provide WO messages in response', done => {
    // given
    sinon.stub(messageUtils, 'getMessages').callsArgWith(1, null, [
      { id:'1', to:'+1', message:'one' },
      { id:'2', to:'+2', message:'two' },
      { id:'3', to:'+3', message:'three' },
    ]);
    const updateMessageTaskStates = sinon.stub(messageUtils, 'updateMessageTaskStates');
    updateMessageTaskStates.callsArgWith(1);

    const req = { body: {} };

    // when
    controller.post(req).then(res => {
      // then
      chai.expect(res).to.deep.equal({
        messages: [
          { id:'1', to:'+1', content:'one' },
          { id:'2', to:'+2', content:'two' },
          { id:'3', to:'+3', content:'three' },
        ],
      });
      chai.expect(updateMessageTaskStates.callCount).to.equal(1);
      chai.expect(updateMessageTaskStates.args[0][0]).to.deep.equal([
        { messageId: '1', state:'forwarded-to-gateway' },
        { messageId: '2', state:'forwarded-to-gateway' },
        { messageId: '3', state:'forwarded-to-gateway' },
      ]);
      done();
    });
  });

  it('post() returns err if something goes wrong', done => {
    sinon.stub(recordUtils, 'createByForm')
      .onCall(0).returns({ message: 'one' });
    sinon.stub(db.medic, 'bulkDocs').returns(Promise.reject(new Error('oh no!')));
    sinon.stub(db.medic, 'query')
        .returns(Promise.resolve({ offset:0, total_rows:0, rows:[] }));
    sinon.stub(messageUtils, 'getMessages').callsArgWith(1, null, []);
    const updateMessageTaskStates = sinon.stub(messageUtils, 'updateMessageTaskStates');
    updateMessageTaskStates.callsArgWith(1, null, {});

    const req = { body: {
      messages: [
        { id:'1', from:'+1', content:'one'   },
      ]
    } };
    // when
    controller.post(req).catch(err => {
      // then
      chai.expect(err.message).to.equal('oh no!');
      done();
    });
  });

});
