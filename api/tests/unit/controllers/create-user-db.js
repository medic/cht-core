var controller = require('../../../controllers/create-user-db'),
    auth = require('../../../auth'),
    userDb = require('../../../lib/user-db'),
    sinon = require('sinon').sandbox.create();

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports['returns error when not logged in'] = test => {
  const req = {};
  const getUserCtx = sinon.stub(auth, 'getUserCtx').callsArgWith(1, 'bang');
  controller(req, err => {
    test.equals(err, 'bang');
    test.equals(getUserCtx.callCount, 1);
    test.done();
  });
};

exports['returns error when putting an invalid db name'] = test => {
  const req = { url: '/medic-user-supersecret-meta/' };
  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, { name: 'gareth' });
  controller(req, err => {
    test.equals(err.code, 403);
    test.done();
  });
};

exports['creates the database and sets permissions'] = test => {
  const req = { url: '/medic-user-gareth-meta/' };
  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, { name: 'gareth' });
  const create = sinon.stub(userDb, 'create').callsArgWith(1);
  controller(req, err => {
    test.equals(err, null);
    test.equals(create.callCount, 1);
    test.equals(create.args[0][0], 'gareth');
    test.done();
  });
};
