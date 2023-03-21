const sinon = require('sinon');
require('chai').use(require('chai-as-promised'));
const { expect } = require('chai');
const initialReplication = require('../../../src/js/bootstrapper/initial-replication');
const utils = require('../../../src/js/bootstrapper/utils');

let localDb;
let remoteDb;
let userCtx;

describe('Initial replication', () => {
  describe('isReplicationNeeded', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('should return true if missing ddoc', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client', error: 'missing' },
            { id: 'settings' },
            { id: 'org.couchdb.user:Nivea' },
          ]
        }),
        get: sinon.stub().resolves({}),
      };
      userCtx = { name: 'Nivea' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);

      expect(localDb.allDocs.args).to.deep.equal([[
        { keys: ['_design/medic-client', 'settings', 'org.couchdb.user:Nivea'] },
      ]]);
      expect(localDb.get.args).to.deep.equal([['_local/initial-replication']]);
    });

    it('should return false if missing settings', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings', error: 'missing' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().resolves({}),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);
    });

    it('should return true if missing user settings', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx', error: 'missing' },
          ]
        }),
        get: sinon.stub().resolves({}),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);
    });

    it('should return true if missing replication log', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().rejects({ status: 404 }),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);
    });

    it('should return false if all conditions are met', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().resolves({}),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(false);
    });

    it('should throw allDocs errors', async () => {
      localDb = {
        allDocs: sinon.stub().rejects(new Error('boom')),
        get: sinon.stub().resolves({}),
      };
      userCtx = { name: 'Skagen' };

      await expect(initialReplication.isReplicationNeeded(localDb, userCtx)).to.be.rejectedWith(Error,'boom');
    });

    it('should not throw local doc get errors', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().rejects(new Error('and its gone')),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);
    });
  });

  describe('replicate', () => {
    it('should perform initial replication', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({

      });
    });
  });
});
