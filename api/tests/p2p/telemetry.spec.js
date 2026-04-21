const sinon = require('sinon');
const { expect } = require('chai');
const auth = require('../../src/auth');
const serverUtils = require('../../src/server-utils');
const { recordTelemetry } = require('../../src/p2p/telemetry');

let req;
let res;

describe('P2P telemetry', () => {
  beforeEach(() => {
    req = { body: {} };
    res = {
      json: sinon.stub(),
      status: sinon.stub().returnsThis(),
    };
    sinon.stub(auth, 'getUserCtx').resolves({ name: 'chw1' });
    sinon.stub(serverUtils, 'error');
  });

  afterEach(() => sinon.restore());

  it('should return 400 when device_id is missing', async () => {
    req.body = { sessions: [{ session_id: 's1' }] };

    await recordTelemetry(req, res);

    expect(serverUtils.error.calledOnce).to.be.true;
    expect(serverUtils.error.args[0][0].code).to.equal(400);
    expect(serverUtils.error.args[0][0].message).to.include('device_id');
  });

  it('should return 400 when sessions is empty', async () => {
    req.body = { device_id: 'device-1', sessions: [] };

    await recordTelemetry(req, res);

    expect(serverUtils.error.calledOnce).to.be.true;
    expect(serverUtils.error.args[0][0].code).to.equal(400);
    expect(serverUtils.error.args[0][0].message).to.include('sessions');
  });

  it('should return 202 on valid telemetry', async () => {
    req.body = {
      device_id: 'device-1',
      sessions: [{
        session_id: 's1',
        role: 'supervisor',
        docs_transferred: 42,
        bytes_transferred: 1024,
        status: 'completed',
      }],
    };

    await recordTelemetry(req, res);

    expect(res.status.calledWith(202)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.args[0][0]).to.deep.equal({ ok: true });
  });

  it('should return error when auth fails', async () => {
    auth.getUserCtx.rejects({ code: 401 });

    await recordTelemetry(req, res);

    expect(serverUtils.error.calledOnce).to.be.true;
  });
});
