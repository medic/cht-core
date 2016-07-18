var controller = require('../../controllers/sms-gateway'),
    messageUtils = require('../../controllers/messages'),
    recordUtils = require('../../controllers/records'),
    utils = require('../utils'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  utils.restore(
    messageUtils.getMessages,
    messageUtils.updateMessage,
    recordUtils.create
  );
  callback();
};

exports['get() should report sms-gateway compatibility'] = function(test) {
  test.expect(2);
  controller.get(null, function(err, results) {
    test.equals(err, null);
    test.equals(results['medic-gateway'], true);
    test.done();
  });
};

exports['post() should save WT messages to DB'] = function(test) {
  // given
  var createRecord = sinon.stub(recordUtils, 'create');
  createRecord.callsArgWith(1, null, { success:true, id:'some-id' });

  mockWoMessages([]);

  var req = mockJsonRequest({
    messages: [
      { id:'1', from:'+1', content:'one'   },
      { id:'2', from:'+2', content:'two'   },
      { id:'3', from:'+3', content:'three' },
    ],
  });

  // when
  controller.post(req, function(err) {
    // then
    test.equals(err, null);
    test.equals(createRecord.callCount, 3);
    test.equals(createRecord.withArgs({ gateway_ref:'1', from:'+1', message:'one'   }).callCount, 1);
    test.equals(createRecord.withArgs({ gateway_ref:'2', from:'+2', message:'two'   }).callCount, 1);
    test.equals(createRecord.withArgs({ gateway_ref:'3', from:'+3', message:'three' }).callCount, 1);
    test.done();
  });
};

exports['post() should update statuses supplied in request'] = function(test) {
  // given
  var updateMessage = sinon.stub(messageUtils, 'updateMessage');
  updateMessage.callsArgWith(2, null, {});

  mockWoMessages([]);

  var req = mockJsonRequest({
    updates: [
      { id:'1', status:'SENT' },
      { id:'2', status:'DELIVERED' },
      { id:'3', status:'FAILED', reason:'bad' },
    ],
  });

  // when
  controller.post(req, function(err) {
    // then
    test.equals(err, null);
    test.equals(updateMessage.callCount, 3);
    test.equals(updateMessage.withArgs('1', { state:'sent' }).callCount, 1);
    test.equals(updateMessage.withArgs('2', { state:'delivered' }).callCount, 1);
    test.equals(updateMessage.withArgs('3', { state:'failed', details:{ reason:'bad' } }).callCount, 1);
    test.done();
  });
};

exports['post() should provide WO messages in response'] = function(test) {
  // given
  mockWoMessages([
    { id:'1', to:'+1', message:'one' },
    { id:'2', to:'+2', message:'two' },
    { id:'3', to:'+3', message:'three' },
  ]);

  var req = mockJsonRequest({});

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
    test.done();
  });
};

exports['post() should continue processing other stuff if saving a wt message fails' ] = function(test) {
  // given
  var createRecord = sinon.stub(recordUtils, 'create');
  createRecord.callsArgWith(1, new Error('testing recordUtils.create failure'));

  var updateMessage = sinon.stub(messageUtils, 'updateMessage');
  updateMessage.callsArgWith(2, null, {});

  mockWoMessages([
    { id:'wo', to:'+WO', message:'wo message' },
  ]);

  var req = mockJsonRequest({
    messages: [
      { id:'wt', from:'+WT', content:'wt message' },
    ],
    updates: [
      { id:'status', status:'SENT' },
    ],
  });

  // when
  controller.post(req, function(err, res) {
    // then
    test.equals(err, null);
    test.equals(createRecord.callCount, 1);
    test.equals(createRecord.withArgs({ gateway_ref:'wt', from:'+WT', message:'wt message' }).callCount, 1);
    test.equals(updateMessage.callCount, 1);
    test.equals(updateMessage.withArgs('status', { state:'sent' }).callCount, 1);
    test.deepEqual(res, {
      messages: [
        { id:'wo', to:'+WO', content:'wo message' },
      ],
    });
    test.done();
  });
};

exports['post() should continue processing other stuff if updating a status fails' ] = function(test) {
  // given
  var createRecord = sinon.stub(recordUtils, 'create');
  createRecord.callsArgWith(1, null, { success:true, id:'some-id' });

  var updateMessage = sinon.stub(messageUtils, 'updateMessage');
  updateMessage.callsArgWith(2, new Error('testing updateMessage failure'));

  mockWoMessages([
    { id:'wo', to:'+WO', message:'wo message' },
  ]);

  var req = mockJsonRequest({
    messages: [
      { id:'wt', from:'+WT', content:'wt message' },
    ],
    updates: [
      { id:'status', status:'SENT' },
    ],
  });

  // when
  controller.post(req, function(err, res) {
    // then
    test.equals(err, null);
    test.equals(createRecord.callCount, 1);
    test.equals(createRecord.withArgs({ gateway_ref:'wt', from:'+WT', message:'wt message' }).callCount, 1);
    test.equals(updateMessage.callCount, 1);
    test.equals(updateMessage.withArgs('status', { state:'sent' }).callCount, 1);
    test.deepEqual(res, {
      messages: [
        { id:'wo', to:'+WO', content:'wo message' },
      ],
    });
    test.done();
  });
};

exports['post() should continue processing other stuff if getting WO messages fails' ] = function(test) {
  // given
  var createRecord = sinon.stub(recordUtils, 'create');
  createRecord.callsArgWith(1, null, { success:true, id:'some-id' });

  var updateMessage = sinon.stub(messageUtils, 'updateMessage');
  updateMessage.callsArgWith(2, null, {});

  var getMessages = sinon.stub(messageUtils, 'getMessages');
  getMessages.callsArgWith(1, new Error('testing getMessages failure'));

  var req = mockJsonRequest({
    messages: [
      { id:'wt', from:'+WT', content:'wt message' },
    ],
    updates: [
      { id:'status', status:'SENT' },
    ],
  });

  // when
  controller.post(req, function(err, res) {
    // then
    test.equals(err, null);
    test.equals(createRecord.callCount, 1);
    test.equals(createRecord.withArgs({ gateway_ref:'wt', from:'+WT', message:'wt message' }).callCount, 1);
    test.equals(updateMessage.callCount, 1);
    test.equals(updateMessage.withArgs('status', { state:'sent' }).callCount, 1);
    test.deepEqual(res, { messages:[] });
    test.done();
  });
};

function mockJsonRequest(responseBody) {
  return {
    on: function(event, callback) {
      switch(event) {
        case 'data': return callback(JSON.stringify(responseBody));
        case 'end': return callback();
        case 'error': // do nothing
      }
    },
  };
}

function mockWoMessages(woMessages) {
  var getMessages = sinon.stub(messageUtils, 'getMessages');
  getMessages.callsArgWith(1, null, woMessages);
}
