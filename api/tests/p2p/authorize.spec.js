const sinon = require('sinon');
const { expect } = require('chai');
const auth = require('../../src/auth');
const config = require('../../src/config');
const db = require('../../src/db');
const serverUtils = require('../../src/server-utils');
const { authorize } = require('../../src/p2p/authorize');

let req;
let res;

describe('P2P authorize', () => {
  beforeEach(() => {
    req = { body: {} };
    res = {
      json: sinon.stub(),
      status: sinon.stub().returnsThis(),
    };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'getUserSettings');
    sinon.stub(config, 'get');
    sinon.stub(serverUtils, 'error');
  });

  afterEach(() => sinon.restore());

  it('should return 403 when P2P is not enabled', async () => {
    auth.getUserCtx.resolves({ name: 'chw1' });
    auth.getUserSettings.resolves({
      _id: 'org.couchdb.user:chw1',
      facility_id: 'facility-1',
      roles: ['chw'],
    });
    config.get.withArgs('p2p_sync').returns({ enabled: false });

    await authorize(req, res);

    expect(serverUtils.error.calledOnce).to.be.true;
    expect(serverUtils.error.args[0][0].code).to.equal(403);
    expect(serverUtils.error.args[0][0].message).to.include('not enabled');
  });

  it('should return 403 when user has no facility_id', async () => {
    auth.getUserCtx.resolves({ name: 'chw1' });
    config.get.withArgs('p2p_sync').returns({ enabled: true });
    auth.getUserSettings.resolves({
      _id: 'org.couchdb.user:chw1',
      roles: ['chw'],
    });

    await authorize(req, res);

    expect(serverUtils.error.calledOnce).to.be.true;
    expect(serverUtils.error.args[0][0].code).to.equal(403);
    expect(serverUtils.error.args[0][0].message).to.include('facility_id');
  });

  it('should return 403 when user role is not allowed', async () => {
    auth.getUserCtx.resolves({ name: 'admin' });
    auth.getUserSettings.resolves({
      _id: 'org.couchdb.user:admin',
      facility_id: 'facility-1',
      roles: ['national_admin'],
    });
    config.get.withArgs('p2p_sync').returns({
      enabled: true,
      allowed_roles: ['chw', 'chw_supervisor'],
    });

    await authorize(req, res);

    expect(serverUtils.error.calledOnce).to.be.true;
    expect(serverUtils.error.args[0][0].code).to.equal(403);
    expect(serverUtils.error.args[0][0].message).to.include('role not authorized');
  });

  it('should return JWT token and scope manifest when authorized', async () => {
    auth.getUserCtx.resolves({ name: 'chw1' });
    auth.getUserSettings.resolves({
      _id: 'org.couchdb.user:chw1',
      facility_id: 'clinic-1a',
      roles: ['chw'],
    });
    config.get.withArgs('p2p_sync').returns({
      enabled: true,
      host_roles: ['chw_supervisor'],
      peer_roles: ['chw'],
      token_expiry_days: 30,
    });
    config.get.withArgs('replication_depth').returns([
      { role: 'chw', depth: '2' },
      { role: 'chw_supervisor', depth: '1' },
    ]);

    // Stub vault DB for key pair
    sinon.stub(db, 'vault').value({
      get: sinon.stub().rejects({ status: 404 }),
      put: sinon.stub().resolves(),
    });
    // Stub medic DB for facility path walk
    sinon.stub(db, 'medic').value({
      get: sinon.stub().callsFake((id) => {
        if (id === 'clinic-1a') {
          return Promise.resolve({ _id: 'clinic-1a', parent: { _id: 'hc-1' } });
        }
        if (id === 'hc-1') {
          return Promise.resolve({ _id: 'hc-1' });
        }
        return Promise.reject({ status: 404 });
      }),
    });

    await authorize(req, res);

    expect(res.json.calledOnce).to.be.true;
    const response = res.json.args[0][0];
    expect(response).to.have.property('token');
    expect(response.token.split('.')).to.have.length(3); // JWT has 3 parts
    expect(response).to.have.property('server_public_key');
    expect(response.server_public_key).to.include('BEGIN PUBLIC KEY');
    expect(response).to.have.property('scope_manifest');
    expect(response.scope_manifest).to.have.property('facility_subtree_root', 'clinic-1a');
    expect(response.scope_manifest).to.have.property('replication_depth', 2);
  });
});
