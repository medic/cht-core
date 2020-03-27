const controller = require('../../../src/controllers/create-user-db');
const chai = require('chai');
const auth = require('../../../src/auth');
const userDb = require('../../../src/services/user-db');
const serverUtils = require('../../../src/server-utils');
const environment = require('../../../src/environment');
const sinon = require('sinon');

describe('create-user-db controller', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('returns error when not logged in', () => {
    const req = 'req';
    const res = 'res';
    sinon.stub(auth, 'getUserCtx').returns(Promise.reject('bang'));
    const error = sinon.stub(serverUtils, 'error').returns();
    return controller(req, res).then(() => {
      chai.expect(error.callCount).to.equal(1);
      chai.expect(error.args[0][0]).to.equal('bang');
      chai.expect(error.args[0][1]).to.equal('req');
      chai.expect(error.args[0][2]).to.equal('res');
    });
  });

  it('returns error when putting an invalid db name', () => {
    const req = { url: `/${environment.db}-user-supersecret-meta/` };
    const res = {};
    sinon.stub(auth, 'getUserCtx').resolves({ name: 'gareth' });
    const error = sinon.stub(serverUtils, 'error').returns();
    return controller(req, res).then(() => {
      chai.expect(error.callCount).to.equal(1);
      chai.expect(error.args[0][0].code).to.equal(403);
    });
  });

  it('creates the database and sets permissions', () => {
    const req = { url: `/${environment.db}-user-gareth-meta/` };
    const res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx').resolves({ name: 'gareth' });
    const create = sinon.stub(userDb, 'create').resolves();
    return controller(req, res).then(() => {
      chai.expect(res.json.callCount).to.equal(1);
      chai.expect(res.json.args[0][0]).to.deep.equal({ ok: true });
      chai.expect(create.callCount).to.equal(1);
      chai.expect(create.args[0][0]).to.equal('gareth');
    });
  });

});
