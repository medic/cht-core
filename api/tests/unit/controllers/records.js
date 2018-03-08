var controller = require('../../../controllers/records'),
    recordUtils = require('../../../controllers/record-utils'),
    sinon = require('sinon').sandbox.create();

exports.tearDown = function (callback) {
  sinon.restore();
  callback();
};

exports['create returns error when unsupported content type'] = function(test) {
  var createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON');
  var createByForm = sinon.stub(recordUtils, 'createByForm');
  var req = {
    body: {
      message: 'test',
      from: '+123'
    }
  };
  controller.create(req, 'jpg', function(err) {
    test.equals(err.message, 'Content type not supported.');
    test.equals(createRecordByJSON.callCount, 0);
    test.equals(createByForm.callCount, 0);
    test.done();
  });
};

exports['create calls createRecordByJSON if json type'] = function(test) {
  var createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON').callsArgWith(1, null, { success: true });
  var createByForm = sinon.stub(recordUtils, 'createByForm');
  var req = {
    body: {
      message: 'test',
      from: '+123'
    }
  };
  controller.create(req, 'json', function(err, actual) {
    test.equals(err, null);
    test.deepEqual(actual, { success: true });
    test.equals(createRecordByJSON.callCount, 1);
    test.deepEqual(createRecordByJSON.args[0][0], req.body);
    test.equals(createByForm.callCount, 0);
    test.done();
  });
};

exports['create calls createByForm if urlencoded type'] = function(test) {
  var createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON');
  var createByForm = sinon.stub(recordUtils, 'createByForm').callsArgWith(2, null, { success: true });
  var req = {
    body: {
      message: 'test',
      from: '+123'
    },
    query: {
      locale: 'fr'
    }
  };
  controller.create(req, 'urlencoded', function(err, actual) {
    test.equals(err, null);
    test.deepEqual(actual, { success: true });
    test.equals(createRecordByJSON.callCount, 0);
    test.equals(createByForm.callCount, 1);
    test.deepEqual(createByForm.args[0][0], req.body);
    test.deepEqual(createByForm.args[0][1], req.query);
    test.done();
  });
};
