var controller = require('../../controllers/records'),
    recordUtils = require('../../controllers/record-utils'),
    utils = require('../utils'),
    sinon = require('sinon');

exports.tearDown = function (callback) {
  utils.restore(
    recordUtils.createRecordByJSON,
    recordUtils.createByForm
  );
  callback();
};

exports['create returns error when unsupported content type'] = function(test) {
  test.expect(3);
  var createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON');
  var createByForm = sinon.stub(recordUtils, 'createByForm');
  var body = {
    message: 'test',
    from: '+123'
  };
  controller.create(body, 'jpg', function(err) {
    test.equals(err.message, 'Content type not supported.');
    test.equals(createRecordByJSON.callCount, 0);
    test.equals(createByForm.callCount, 0);
    test.done();
  });
};

exports['create calls createRecordByJSON if json type'] = function(test) {
  test.expect(5);
  var createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON').callsArgWith(1, null, { success: true });
  var createByForm = sinon.stub(recordUtils, 'createByForm');
  var body = {
    message: 'test',
    from: '+123'
  };
  controller.create(body, 'json', function(err, actual) {
    test.equals(err, null);
    test.deepEqual(actual, { success: true });
    test.equals(createRecordByJSON.callCount, 1);
    test.deepEqual(createRecordByJSON.args[0][0], body);
    test.equals(createByForm.callCount, 0);
    test.done();
  });
};

exports['create calls createByForm if urlencoded type'] = function(test) {
  test.expect(5);
  var createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON');
  var createByForm = sinon.stub(recordUtils, 'createByForm').callsArgWith(1, null, { success: true });
  var body = {
    message: 'test',
    from: '+123'
  };
  controller.create(body, 'urlencoded', function(err, actual) {
    test.equals(err, null);
    test.deepEqual(actual, { success: true });
    test.equals(createRecordByJSON.callCount, 0);
    test.equals(createByForm.callCount, 1);
    test.deepEqual(createByForm.args[0][0], body);
    test.done();
  });
};
