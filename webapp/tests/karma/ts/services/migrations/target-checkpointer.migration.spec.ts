import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@mm-services/db.service';
import { TargetCheckpointerMigration } from '@mm-services/migrations/target-checkpointer.migration';

describe('Target Checkpoint Migration', () => {
  let dbService;
  let localDb;
  let remoteDb;
  let migration;
  let clock;

  beforeEach(() => {
    localDb = {};
    remoteDb = {};
    const dbServiceGet = sinon.stub().returns(localDb);
    dbServiceGet.withArgs({ remote: true }).returns(remoteDb);
    dbService = { get: dbServiceGet };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
      ]
    });
    migration = TestBed.inject(TargetCheckpointerMigration);
  });

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
  });

  describe('run', () => {
    it('should copy local replication "to" checkpointer to the server', async () => {
      const checkpointerDoc = Object.freeze({ _id: '_local/checkpointer' });
      localDb.get = sinon.stub().resolves(checkpointerDoc);
      localDb.id = sinon.stub().resolves('localid');

      remoteDb.put = sinon.stub().resolves();
      remoteDb.id = sinon.stub().resolves('remoteid');

      await migration.run();

      expect(localDb.id.callCount).to.equal(1);
      expect(remoteDb.id.callCount).to.equal(1);
      expect(localDb.get.args).to.deep.equal([['_local/5nnObAuU3BYgp3a4zuBTsA==']]);
      expect(remoteDb.put.args).to.deep.equal([[checkpointerDoc]]);
    });

    it('should do nothing when checkpointer does not exist', async () => {
      localDb.get = sinon.stub().rejects({ status: 404 });
      localDb.id = sinon.stub().resolves('localid');
      remoteDb.id = sinon.stub().resolves('remoteid');

      await migration.run();

      expect(localDb.id.callCount).to.equal(1);
      expect(remoteDb.id.callCount).to.equal(1);
      expect(localDb.get.args).to.deep.equal([['_local/5nnObAuU3BYgp3a4zuBTsA==']]);
    });

    it('should throw local get errors', async () => {
      localDb.get = sinon.stub().rejects(new Error('failed to get'));

      localDb.id = sinon.stub().resolves('localid');
      remoteDb.id = sinon.stub().resolves('remoteid');

      await expect(migration.run()).to.be.rejectedWith(Error, 'failed to get');
    });

    it('should do nothing when remote returns conflict', async () => {
      const checkpointerDoc = Object.freeze({ _id: '_local/check' });
      localDb.get = sinon.stub().resolves(checkpointerDoc);
      localDb.id = sinon.stub().resolves('localid');
      remoteDb.id = sinon.stub().resolves('remoteid');
      remoteDb.put = sinon.stub().rejects({ status: 409 });

      await migration.run();

      expect(localDb.id.callCount).to.equal(1);
      expect(remoteDb.id.callCount).to.equal(1);
      expect(localDb.get.args).to.deep.equal([['_local/5nnObAuU3BYgp3a4zuBTsA==']]);
    });

    it('should throw remote put errors', async () => {
      const checkpointerDoc = Object.freeze({ _id: '_local/checkpointer' });
      localDb.get = sinon.stub().resolves(checkpointerDoc);
      localDb.id = sinon.stub().resolves('localid');

      remoteDb.put = sinon.stub().rejects(new Error('failed'));
      remoteDb.id = sinon.stub().resolves('remoteid');

      await expect(migration.run()).to.be.rejectedWith(Error, 'failed');
    });
  });

  describe('hasRun', () => {
    it('should return false when flag local doc was not found', async () => {
      localDb.get = sinon.stub().rejects({ status: 404 });
      expect(await migration.hasRun(dbService)).to.equal(false);
      expect(localDb.get.args).to.deep.equal([['_local/migration-checkpointer']]);
    });

    it('should return true when flag local doc was found', async () => {
      localDb.get = sinon.stub().resolves({ the: 'doc' });
      expect(await migration.hasRun(dbService)).to.equal(true);
      expect(localDb.get.args).to.deep.equal([['_local/migration-checkpointer']]);
    });

    it('should throw error', async () => {
      localDb.get = sinon.stub().rejects(new Error('failed for some reason'));
      await expect(migration.hasRun(dbService)).to.be.rejectedWith(Error, 'failed for some reason');
    });
  });

  describe('setHasRun', () => {
    it('should write flag local doc', async () => {
      const now = 123345;
      clock = sinon.useFakeTimers(now);
      localDb.put = sinon.stub().resolves();
      await migration.setHasRun(dbService);
      expect(localDb.put.args).to.deep.equal([[{
        _id: '_local/migration-checkpointer',
        date: now,
      }]]);
    });

    it('should throw error', async () => {
      localDb.put = sinon.stub().rejects(new Error('cant write'));
      await expect(migration.setHasRun(dbService)).to.be.rejectedWith(Error, 'cant write');
    });
  });
});

