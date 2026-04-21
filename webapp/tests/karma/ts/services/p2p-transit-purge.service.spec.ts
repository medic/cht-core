import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { P2pTransitPurgeService } from '@mm-services/p2p-transit-purge.service';
import { P2pTransitFilterService } from '@mm-services/p2p-transit-filter.service';
import { DbService } from '@mm-services/db.service';

describe('P2pTransitPurgeService', () => {
  let service: P2pTransitPurgeService;
  let dbService;
  let localDb;
  let transitFilterService;

  beforeEach(() => {
    localDb = {
      get: sinon.stub(),
      put: sinon.stub().resolves({ ok: true }),
    };
    dbService = { get: () => localDb };
    transitFilterService = {
      refresh: sinon.stub().resolves(),
    };

    // Remove any bridge mock from previous tests
    delete (window as any).medicmobile_android;

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: P2pTransitFilterService, useValue: transitFilterService },
      ],
    });

    service = TestBed.inject(P2pTransitPurgeService);
  });

  afterEach(() => {
    sinon.restore();
    delete (window as any).medicmobile_android;
  });

  describe('purgeConfirmedTransitDocs()', () => {
    it('should return empty result when no transit doc exists', async () => {
      localDb.get.rejects({ status: 404 });

      const result = await service.purgeConfirmedTransitDocs();

      expect(result).to.deep.equal({ purged: 0, failed: 0, alreadyPurged: 0 });
    });

    it('should return empty result when no purgeable batches', async () => {
      localDb.get.withArgs('_local/p2p-transit-docs').resolves({
        _id: '_local/p2p-transit-docs',
        batches: {
          'batch-1': {
            pushed_to_server: false,
            purged: false,
            doc_count: 2,
            received_at: Date.now(),
          },
        },
        transit_index: { 'doc-a': 'batch-1', 'doc-b': 'batch-1' },
        stats: { total_received: 2, total_pushed: 0, total_purged: 0, pending_push: 2 },
      });

      const result = await service.purgeConfirmedTransitDocs();

      expect(result).to.deep.equal({ purged: 0, failed: 0, alreadyPurged: 0 });
    });

    it('should purge docs from pushed batches', async () => {
      const transitDoc = {
        _id: '_local/p2p-transit-docs',
        batches: {
          'batch-1': {
            pushed_to_server: true,
            purged: false,
            doc_count: 2,
            received_at: Date.now() - 1000,
            pushed_at: Date.now(),
          },
        },
        transit_index: { 'doc-a': 'batch-1', 'doc-b': 'batch-1' },
        stats: { total_received: 2, total_pushed: 2, total_purged: 0, pending_push: 2 },
      };
      localDb.get.withArgs('_local/p2p-transit-docs').resolves(transitDoc);
      localDb.get.withArgs('doc-a').resolves({ _id: 'doc-a', _rev: '1-abc' });
      localDb.get.withArgs('doc-b').resolves({ _id: 'doc-b', _rev: '1-def' });
      localDb.put.resolves({ ok: true });

      const result = await service.purgeConfirmedTransitDocs();

      expect(result.purged).to.equal(2);
      expect(result.failed).to.equal(0);
      expect(transitFilterService.refresh.callCount).to.equal(1);
    });

    it('should handle already-purged docs gracefully', async () => {
      const transitDoc = {
        _id: '_local/p2p-transit-docs',
        batches: {
          'batch-1': {
            pushed_to_server: true,
            purged: false,
            doc_count: 1,
            received_at: Date.now() - 1000,
            pushed_at: Date.now(),
          },
        },
        transit_index: { 'doc-a': 'batch-1' },
        stats: { total_received: 1, total_pushed: 1, total_purged: 0, pending_push: 1 },
      };
      localDb.get.withArgs('_local/p2p-transit-docs').resolves(transitDoc);
      localDb.get.withArgs('doc-a').rejects({ status: 404 });
      localDb.put.resolves({ ok: true });

      const result = await service.purgeConfirmedTransitDocs();

      expect(result.alreadyPurged).to.equal(1);
      expect(result.purged).to.equal(0);
    });
  });

  describe('hasStaleTransitDocs()', () => {
    it('should return false when no transit doc exists', async () => {
      localDb.get.rejects({ status: 404 });

      const result = await service.hasStaleTransitDocs();

      expect(result).to.equal(false);
    });

    it('should return false when all batches are recent', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        batches: {
          'batch-1': {
            pushed_to_server: false,
            purged: false,
            received_at: Date.now() - 1000,
            doc_count: 1,
          },
        },
        transit_index: { 'doc-a': 'batch-1' },
        stats: { total_received: 1, total_pushed: 0, total_purged: 0, pending_push: 1 },
      });

      const result = await service.hasStaleTransitDocs();

      expect(result).to.equal(false);
    });

    it('should return true when batch is older than 30 days', async () => {
      const thirtyOneDaysAgo = Date.now() - (31 * 24 * 60 * 60 * 1000);
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        batches: {
          'batch-1': {
            pushed_to_server: false,
            purged: false,
            received_at: thirtyOneDaysAgo,
            doc_count: 1,
          },
        },
        transit_index: { 'doc-a': 'batch-1' },
        stats: { total_received: 1, total_pushed: 0, total_purged: 0, pending_push: 1 },
      });

      const result = await service.hasStaleTransitDocs();

      expect(result).to.equal(true);
    });

    it('should not flag pushed batches as stale', async () => {
      const thirtyOneDaysAgo = Date.now() - (31 * 24 * 60 * 60 * 1000);
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        batches: {
          'batch-1': {
            pushed_to_server: true,
            purged: false,
            received_at: thirtyOneDaysAgo,
            doc_count: 1,
            pushed_at: Date.now(),
          },
        },
        transit_index: { 'doc-a': 'batch-1' },
        stats: { total_received: 1, total_pushed: 1, total_purged: 0, pending_push: 0 },
      });

      const result = await service.hasStaleTransitDocs();

      expect(result).to.equal(false);
    });
  });

  describe('getPendingPurgeCount()', () => {
    it('should return 0 when no transit doc exists', async () => {
      localDb.get.rejects({ status: 404 });

      const count = await service.getPendingPurgeCount();

      expect(count).to.equal(0);
    });

    it('should return 0 when no batches are pending', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        batches: {
          'batch-1': {
            pushed_to_server: false,
            purged: false,
            doc_count: 3,
            received_at: Date.now(),
          },
        },
        transit_index: {},
        stats: { total_received: 3, total_pushed: 0, total_purged: 0, pending_push: 3 },
      });

      const count = await service.getPendingPurgeCount();

      expect(count).to.equal(0);
    });

    it('should return count of docs in pushed-but-unpurged batches', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        batches: {
          'batch-1': {
            pushed_to_server: true,
            purged: false,
            doc_count: 5,
            received_at: Date.now() - 1000,
            pushed_at: Date.now(),
          },
          'batch-2': {
            pushed_to_server: true,
            purged: true,
            doc_count: 3,
            received_at: Date.now() - 2000,
            pushed_at: Date.now(),
            purged_at: Date.now(),
          },
          'batch-3': {
            pushed_to_server: false,
            purged: false,
            doc_count: 2,
            received_at: Date.now(),
          },
        },
        transit_index: {},
        stats: { total_received: 10, total_pushed: 8, total_purged: 3, pending_push: 2 },
      });

      const count = await service.getPendingPurgeCount();

      expect(count).to.equal(5);
    });
  });

  describe('markAllBatchesPushedAndPurge()', () => {
    it('should return empty result when no transit doc exists', async () => {
      localDb.get.rejects({ status: 404 });

      const result = await service.markAllBatchesPushedAndPurge();

      expect(result).to.deep.equal({ purged: 0, failed: 0, alreadyPurged: 0 });
    });

    it('should mark unpushed batches as pushed and purge', async () => {
      const transitDoc = {
        _id: '_local/p2p-transit-docs',
        _rev: '1-abc',
        batches: {
          'batch-1': {
            pushed_to_server: false,
            purged: false,
            doc_count: 1,
            received_at: Date.now() - 1000,
          },
        },
        transit_index: { 'doc-a': 'batch-1' },
        stats: { total_received: 1, total_pushed: 0, total_purged: 0, pending_push: 1 },
      };
      // First call for markAllBatchesPushedAndPurge getTransitDoc
      localDb.get.withArgs('_local/p2p-transit-docs').resolves(transitDoc);
      localDb.get.withArgs('doc-a').resolves({ _id: 'doc-a', _rev: '1-xyz' });
      localDb.put.resolves({ ok: true });

      const result = await service.markAllBatchesPushedAndPurge();

      expect(result.purged).to.equal(1);
      // Should have called put to save the marked batch
      expect(localDb.put.callCount).to.be.greaterThan(0);
    });
  });
});
