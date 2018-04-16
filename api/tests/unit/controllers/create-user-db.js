var controller = require('../../../controllers/create-user-db'),
    auth = require('../../../auth'),
    userDb = require('../../../services/user-db'),
    serverUtils = require('../../../server-utils'),
    sinon = require('sinon').sandbox.create();

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['returns error when not logged in'] = test => {
  const req = 'req';
  const res = 'res';
  sinon.stub(auth, 'getUserCtx').callsArgWith(1, 'bang');
  const error = sinon.stub(serverUtils, 'error').returns();
  controller(req, res);
  test.equals(error.callCount, 1);
  test.equals(error.args[0][0], 'bang');
  test.equals(error.args[0][1], 'req');
  test.equals(error.args[0][2], 'res');
  test.done();
};

exports['returns error when putting an invalid db name'] = test => {
  const req = { url: '/medic-user-supersecret-meta/' };
  const res = {};
  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, { name: 'gareth' });
  const error = sinon.stub(serverUtils, 'error').returns();
  controller(req, res);
  test.equals(error.callCount, 1);
  test.equals(error.args[0][0].code, 403);
  test.done();
};

exports['creates the database and sets permissions'] = test => {
  const req = { url: '/medic-user-gareth-meta/' };
  const res = { json: sinon.stub() };
  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, { name: 'gareth' });
  const create = sinon.stub(userDb, 'create').callsArgWith(1);
  controller(req, res);
  test.equals(res.json.callCount, 1);
  test.deepEqual(res.json.args[0][0], { ok: true });
  test.equals(create.callCount, 1);
  test.equals(create.args[0][0], 'gareth');
  test.done();
};
