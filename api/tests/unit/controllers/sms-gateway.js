const controller = require('../../../controllers/sms-gateway'),
      messageUtils = require('../../../message-utils'),
      recordUtils = require('../../../controllers/record-utils'),
      db = require('../../../db-pouch'),
      sinon = require('sinon').sandbox.create();

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['get() should report sms-gateway compatibility'] = test => {
  const results = controller.get();
  test.equals(results['medic-gateway'], true);
  test.done();
};

exports['post() should save WT messages to DB'] = test => {
  // given
  const createRecord = sinon.stub(recordUtils, 'createByForm')
    .onCall(0).returns({ message: 'one' })
    .onCall(1).returns({ message: 'two' })
    .onCall(2).returns({ message: 'three' });
  const bulkDocs = sinon.stub().returns(Promise.resolve([ { ok: true, id: 'some-id' } ]));
  db.medic = { bulkDocs: bulkDocs, query: () => Promise.resolve({ rows: [] }) };
  const getMessages = sinon.stub(messageUtils, 'getMessages').callsArgWith(1, null, []);
  const updateMessageTaskStates = sinon.stub(messageUtils, 'updateMessageTaskStates');
  updateMessageTaskStates.callsArgWith(1, null, {});

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
    test.equals(getMessages.callCount, 1);
    test.equals(createRecord.callCount, 3);
    test.deepEqual(createRecord.args[0][0], { gateway_ref: '1', from: '+1', message: 'one'   });
    test.deepEqual(createRecord.args[1][0], { gateway_ref: '2', from: '+2', message: 'two'   });
    test.deepEqual(createRecord.args[2][0], { gateway_ref: '3', from: '+3', message: 'three' });
    test.equals(bulkDocs.callCount, 1);
    test.deepEqual(bulkDocs.args[0][0], [
      { message: 'one' },
      { message: 'two' },
      { message: 'three' }
    ]);
    test.done();
  });
};

exports['post() should update statuses supplied in request'] = test => {
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
    test.deepEqual(updateMessageTaskStates.args[0][0], [
      { messageId: '1', state:'received-by-gateway' },
      { messageId: '2', state:'forwarded-by-gateway'},
      { messageId: '3', state:'sent' },
      { messageId: '4', state:'delivered' },
      { messageId: '5', state:'failed', details:{ reason:'bad' } },
    ]);
    test.done();
  });
};

exports['post() should persist unknown statuses'] = test => {
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
    test.deepEqual(updateMessageTaskStates.args[0][0], [
      { messageId: '1', state:'unrecognised', details:{ gateway_status:'INVENTED-1' }},
      { messageId: '2', state:'unrecognised', details:{ gateway_status:'INVENTED-2' }},
    ]);
    test.done();
  });
};

exports['post() should provide WO messages in response'] = test => {
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
    test.deepEqual(res, {
      messages: [
        { id:'1', to:'+1', content:'one' },
        { id:'2', to:'+2', content:'two' },
        { id:'3', to:'+3', content:'three' },
      ],
    });
    test.equals(updateMessageTaskStates.callCount, 1);
    test.deepEqual(updateMessageTaskStates.args[0][0], [
      { messageId: '1', state:'forwarded-to-gateway' },
      { messageId: '2', state:'forwarded-to-gateway' },
      { messageId: '3', state:'forwarded-to-gateway' },
    ]);
    test.done();
  });
};

exports['post() returns err if something goes wrong'] = test => {
  sinon.stub(recordUtils, 'createByForm')
    .onCall(0).returns({ message: 'one' });
  const bulkDocs = sinon.stub().returns(Promise.reject(new Error('oh no!')));
  db.medic = { bulkDocs: bulkDocs, query: () => Promise.resolve({ rows: [] }) };
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
    test.equal(err.message, 'oh no!');
    test.done();
  });
};
