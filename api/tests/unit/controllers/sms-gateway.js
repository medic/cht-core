const controller = require('../../../controllers/sms-gateway'),
      messageUtils = require('../../../controllers/messages'),
      recordUtils = require('../../../controllers/record-utils'),
      sinon = require('sinon').sandbox.create();

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['get() should report sms-gateway compatibility'] = function(test) {
  test.expect(2);
  controller.get((err, results) => {
    test.equals(err, null);
    test.equals(results['medic-gateway'], true);
    test.done();
  });
};

exports['post() should save WT messages to DB'] = function(test) {
  test.expect(6);
  // given
  const createRecord = sinon.stub(recordUtils, 'createByForm').callsArgWith(1, null, { success:true, id:'some-id' });
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
  controller.post(req, err => {
    // then
    test.equals(err, null);
    test.equals(getMessages.callCount, 1);
    test.equals(createRecord.callCount, 3);
    test.equals(createRecord.withArgs({ gateway_ref:'1', from:'+1', message:'one'   }).callCount, 1);
    test.equals(createRecord.withArgs({ gateway_ref:'2', from:'+2', message:'two'   }).callCount, 1);
    test.equals(createRecord.withArgs({ gateway_ref:'3', from:'+3', message:'three' }).callCount, 1);
    test.done();
  });
};

exports['post() should update statuses supplied in request'] = function(test) {
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
  controller.post(req, err => {
    // then
    test.equal(err, null);
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

exports['post() should persist unknown statuses'] = function(test) {
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
  controller.post(req, err => {
    // then
    test.equal(err, null);
    test.deepEqual(updateMessageTaskStates.args[0][0], [
      { messageId: '1', state:'unrecognised', details:{ gateway_status:'INVENTED-1' }},
      { messageId: '2', state:'unrecognised', details:{ gateway_status:'INVENTED-2' }},
    ]);
    test.done();
  });
};

exports['post() should provide WO messages in response'] = function(test) {
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
  controller.post(req, function(err, res) {
    // then
    test.equals(err, null);
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
  sinon.stub(recordUtils, 'createByForm').callsArgWith(1, Error('oh no!'));

  const req = { body: {
    messages: [
      { id:'1', from:'+1', content:'one'   },
      { id:'2', from:'+2', content:'two'   },
      { id:'3', from:'+3', content:'three' },
    ]
  } };

  // when
  controller.post(req, err => {
    // then
    test.ok(err);
    test.equal(err.message, 'oh no!');
    test.done();
  });
};
