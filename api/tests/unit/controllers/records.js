const controller = require('../../../src/controllers/records'),
      db = require('../../../src/db-pouch'),
      auth = require('../../../src/auth'),
      recordUtils = require('../../../src/controllers/record-utils'),
      sinon = require('sinon').sandbox.create();

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['create calls createRecordByJSON if json type'] = test => {
  sinon.stub(auth, 'check').resolves();
  const reqIs = sinon.stub().returns(false);
  reqIs.withArgs('json').returns('json'); // yes, it actually returns 'json'
  const createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON').returns({ message: 'one' });
  const createByForm = sinon.stub(recordUtils, 'createByForm');
  const post = sinon.stub(db.medic, 'post').returns(Promise.resolve({ ok: true, id: 'xyz' }));
  const json = sinon.stub();
  const req = {
    body: {
      message: 'test',
      from: '+123'
    },
    is: reqIs
  };
  const res = { json: json };
  controller.v2(req, res).then(() => {
    test.equals(json.callCount, 1);
    test.deepEqual(json.args[0][0], { success: true, id: 'xyz' });
    test.equals(createRecordByJSON.callCount, 1);
    test.deepEqual(createRecordByJSON.args[0][0], req.body);
    test.equals(createByForm.callCount, 0);
    test.equals(post.callCount, 1);
    test.deepEqual(post.args[0][0], { message: 'one' });
    test.done();
  });
};

exports['create calls createByForm if urlencoded type'] = test => {
  sinon.stub(auth, 'check').resolves();
  const reqIs = sinon.stub().returns(false);
  reqIs.withArgs('urlencoded').returns('urlencoded');
  const createRecordByJSON = sinon.stub(recordUtils, 'createRecordByJSON');
  const createByForm = sinon.stub(recordUtils, 'createByForm').returns({ message: 'one' });
  const post = sinon.stub(db.medic, 'post').returns(Promise.resolve({ ok: true, id: 'zyx' }));
  const json = sinon.stub();
  const req = {
    body: {
      message: 'test',
      from: '+123'
    },
    is: reqIs
  };
  const res = { json: json };
  controller.v2(req, res).then(() => {
    test.equals(json.callCount, 1);
    test.deepEqual(json.args[0][0], { success: true, id: 'zyx' });
    test.equals(createRecordByJSON.callCount, 0);
    test.equals(createByForm.callCount, 1);
    test.deepEqual(createByForm.args[0][0], req.body);
    test.equals(post.callCount, 1);
    test.deepEqual(post.args[0][0], { message: 'one' });
    test.done();
  });
};
