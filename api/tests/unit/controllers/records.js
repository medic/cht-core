const controller = require('../../../controllers/records'),
      db = require('../../../db-pouch'),
      recordUtils = require('../../../controllers/record-utils'),
      sinon = require('sinon').sandbox.create();

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['create returns error when unsupported content type'] = test => {
  const createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON');
  const createByForm = sinon.stub(recordUtils, 'createByForm');
  const req = {
    body: {
      message: 'test',
      from: '+123'
    }
  };
  controller.create(req, 'jpg')
    .then(() => {
      test.fail('should throw an error');
    })
    .catch(err => {
      test.equals(err.message, 'Content type not supported.');
      test.equals(createRecordByJSON.callCount, 0);
      test.equals(createByForm.callCount, 0);
      test.done();
    });
};

exports['create calls createRecordByJSON if json type'] = test => {
  const createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON').returns({ message: 'one' });
  const createByForm = sinon.stub(recordUtils, 'createByForm');
  const put = sinon.stub().returns(Promise.resolve({ ok: true }));
  db._setMedic({ put: put });
  const req = {
    body: {
      message: 'test',
      from: '+123'
    }
  };
  controller.create(req, 'json').then(actual => {
    test.deepEqual(actual, { success: true });
    test.equals(createRecordByJSON.callCount, 1);
    test.deepEqual(createRecordByJSON.args[0][0], req.body);
    test.equals(createByForm.callCount, 0);
    test.equals(put.callCount, 1);
    test.deepEqual(put.args[0][0], { message: 'one' });
    test.done();
  });
};

exports['create calls createByForm if urlencoded type'] = test => {
  const createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON');
  const createByForm = sinon.stub(recordUtils, 'createByForm').returns({ message: 'one' });
  const put = sinon.stub().returns(Promise.resolve({ ok: true }));
  db._setMedic({ put: put });
  const req = {
    body: {
      message: 'test',
      from: '+123'
    },
    query: {
      locale: 'fr'
    }
  };
  controller.create(req, 'urlencoded').then(actual => {
    test.deepEqual(actual, { success: true });
    test.equals(createRecordByJSON.callCount, 0);
    test.equals(createByForm.callCount, 1);
    test.deepEqual(createByForm.args[0][0], req.body);
    test.deepEqual(createByForm.args[0][1], req.query);
    test.equals(put.callCount, 1);
    test.deepEqual(put.args[0][0], { message: 'one' });
    test.done();
  });
};
