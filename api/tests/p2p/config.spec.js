const sinon = require('sinon');
const { expect } = require('chai');
const auth = require('../../src/auth');
const config = require('../../src/config');
const serverUtils = require('../../src/server-utils');
const { getConfig } = require('../../src/p2p/config');

let req;
let res;

describe('P2P config', () => {
  beforeEach(() => {
    req = { params: { facility_id: 'facility-1' } };
    res = {
      json: sinon.stub(),
      status: sinon.stub().returnsThis(),
    };
    sinon.stub(auth, 'getUserCtx').resolves({ name: 'chw1' });
    sinon.stub(config, 'get');
    sinon.stub(serverUtils, 'error');
  });

  afterEach(() => sinon.restore());

  it('should return defaults when p2p_sync is not configured', async () => {
    config.get.withArgs('p2p_sync').returns(undefined);

    await getConfig(req, res);

    expect(res.json.calledOnce).to.be.true;
    const result = res.json.args[0][0];
    expect(result.enabled).to.equal(false);
    expect(result.host_roles).to.deep.equal([]);
    expect(result.peer_roles).to.deep.equal([]);
    expect(result.max_doc_size_kb).to.equal(256);
    expect(result.token_expiry_days).to.equal(30);
    expect(result.wifi_hotspot_idle_timeout_sec).to.equal(300);
    expect(result.transit_relay.enabled).to.equal(true);
    expect(result.transit_relay.max_age_days).to.equal(30);
  });

  it('should return configured values when p2p_sync is set', async () => {
    config.get.withArgs('p2p_sync').returns({
      enabled: true,
      host_roles: ['chw_supervisor', 'manager'],
      max_doc_size_kb: 512,
    });

    await getConfig(req, res);

    expect(res.json.calledOnce).to.be.true;
    const result = res.json.args[0][0];
    expect(result.enabled).to.equal(true);
    expect(result.host_roles).to.deep.equal(['chw_supervisor', 'manager']);
    expect(result.max_doc_size_kb).to.equal(512);
    expect(result.peer_roles).to.deep.equal([]);
  });

  it('should return error when auth fails', async () => {
    auth.getUserCtx.rejects({ code: 401, message: 'Not authenticated' });

    await getConfig(req, res);

    expect(serverUtils.error.calledOnce).to.be.true;
  });
});
