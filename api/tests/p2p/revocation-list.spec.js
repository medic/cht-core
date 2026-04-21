const sinon = require('sinon');
const { expect } = require('chai');
const auth = require('../../src/auth');
const db = require('../../src/db');
const serverUtils = require('../../src/server-utils');
const { getRevocationList, getRevocationListData } = require('../../src/p2p/revocation-list');

let req;
let res;

describe('P2P revocation-list', () => {
  beforeEach(() => {
    req = {};
    res = {
      json: sinon.stub(),
      status: sinon.stub().returnsThis(),
    };
    sinon.stub(auth, 'getUserCtx').resolves({ name: 'chw1' });
    sinon.stub(serverUtils, 'error');
  });

  afterEach(() => sinon.restore());

  describe('getRevocationListData', () => {
    it('should return empty list when doc does not exist', async () => {
      sinon.stub(db, 'medic').value({
        get: sinon.stub().rejects({ status: 404 }),
      });

      const result = await getRevocationListData();

      expect(result.version).to.equal(0);
      expect(result.revoked_devices).to.deep.equal([]);
      expect(result.revoked_users).to.deep.equal([]);
      expect(result.updated_at).to.be.null;
    });

    it('should return stored revocation list', async () => {
      sinon.stub(db, 'medic').value({
        get: sinon.stub().resolves({
          _id: 'p2p-revocation-list',
          version: 3,
          revoked_devices: ['device-abc'],
          revoked_users: ['user-xyz'],
          updated_at: '2026-03-01T00:00:00Z',
        }),
      });

      const result = await getRevocationListData();

      expect(result.version).to.equal(3);
      expect(result.revoked_devices).to.deep.equal(['device-abc']);
      expect(result.revoked_users).to.deep.equal(['user-xyz']);
    });
  });

  describe('getRevocationList endpoint', () => {
    it('should return revocation list to authenticated user', async () => {
      sinon.stub(db, 'medic').value({
        get: sinon.stub().resolves({
          _id: 'p2p-revocation-list',
          version: 1,
          revoked_devices: [],
          revoked_users: [],
          updated_at: '2026-03-01T00:00:00Z',
        }),
      });

      await getRevocationList(req, res);

      expect(res.json.calledOnce).to.be.true;
      const result = res.json.args[0][0];
      expect(result).to.have.property('version', 1);
      expect(result).to.have.property('revoked_devices').that.is.an('array');
    });

    it('should return error when auth fails', async () => {
      auth.getUserCtx.rejects({ code: 401 });

      await getRevocationList(req, res);

      expect(serverUtils.error.calledOnce).to.be.true;
    });
  });
});
