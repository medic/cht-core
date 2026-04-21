import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { P2pTransitFilterService } from '@mm-services/p2p-transit-filter.service';
import { DbService } from '@mm-services/db.service';

describe('P2pTransitFilterService', () => {
  let service: P2pTransitFilterService;
  let dbService;
  let localDb;

  beforeEach(() => {
    localDb = {
      get: sinon.stub(),
      put: sinon.stub(),
    };
    dbService = { get: () => localDb };

    // Remove any bridge mock from previous tests
    delete (window as any).medicmobile_android;

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
      ],
    });

    service = TestBed.inject(P2pTransitFilterService);
  });

  afterEach(() => {
    sinon.restore();
    delete (window as any).medicmobile_android;
  });

  describe('isTransitDoc()', () => {
    it('should return false before loading', () => {
      expect(service.isTransitDoc('some-doc-id')).to.equal(false);
    });

    it('should return true for transit doc IDs after loading', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: {
          'doc-a': 'batch-1',
          'doc-b': 'batch-1',
        },
      });

      await service.loadTransitIndex();

      expect(service.isTransitDoc('doc-a')).to.equal(true);
      expect(service.isTransitDoc('doc-b')).to.equal(true);
      expect(service.isTransitDoc('doc-c')).to.equal(false);
    });
  });

  describe('loadTransitIndex()', () => {
    it('should load transit doc IDs from PouchDB', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: { 'doc-x': 'batch-1' },
      });

      await service.loadTransitIndex();

      expect(service.isLoaded()).to.equal(true);
      expect(service.getTransitDocCount()).to.equal(1);
      expect(localDb.get.callCount).to.equal(1);
      expect(localDb.get.args[0][0]).to.equal('_local/p2p-transit-docs');
    });

    it('should handle 404 when no transit doc exists', async () => {
      localDb.get.rejects({ status: 404 });

      await service.loadTransitIndex();

      expect(service.isLoaded()).to.equal(true);
      expect(service.getTransitDocCount()).to.equal(0);
    });

    it('should handle non-404 errors gracefully', async () => {
      localDb.get.rejects({ status: 500, message: 'db error' });

      await service.loadTransitIndex();

      expect(service.isLoaded()).to.equal(true);
      expect(service.getTransitDocCount()).to.equal(0);
    });

    it('should not reload if already loaded', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: { 'doc-a': 'batch-1' },
      });

      await service.loadTransitIndex();
      await service.loadTransitIndex();

      expect(localDb.get.callCount).to.equal(1);
    });

    it('should load from bridge when available', async () => {
      (window as any).medicmobile_android = {
        p2pGetTransitDocIds: sinon.stub().returns(
          JSON.stringify(['bridge-doc-1', 'bridge-doc-2'])
        ),
      };

      await service.loadTransitIndex();

      expect(service.isTransitDoc('bridge-doc-1')).to.equal(true);
      expect(service.isTransitDoc('bridge-doc-2')).to.equal(true);
      expect(localDb.get.callCount).to.equal(0);
    });

    it('should fall back to PouchDB when bridge call fails', async () => {
      (window as any).medicmobile_android = {
        p2pGetTransitDocIds: sinon.stub().throws(new Error('bridge error')),
      };
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: { 'fallback-doc': 'batch-1' },
      });

      await service.loadTransitIndex();

      expect(service.isTransitDoc('fallback-doc')).to.equal(true);
      expect(localDb.get.callCount).to.equal(1);
    });
  });

  describe('getTransitDocCount()', () => {
    it('should return 0 before loading', () => {
      expect(service.getTransitDocCount()).to.equal(0);
    });

    it('should return correct count after loading', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: {
          'doc-1': 'batch-1',
          'doc-2': 'batch-1',
          'doc-3': 'batch-2',
        },
      });

      await service.loadTransitIndex();

      expect(service.getTransitDocCount()).to.equal(3);
    });
  });

  describe('filterTransitDocs()', () => {
    it('should return original array when no transit docs', () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }];
      const result = service.filterTransitDocs(docs);

      expect(result).to.equal(docs);
    });

    it('should filter out transit docs', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: { 'doc-b': 'batch-1' },
      });

      await service.loadTransitIndex();

      const docs = [{ _id: 'doc-a' }, { _id: 'doc-b' }, { _id: 'doc-c' }];
      const result = service.filterTransitDocs(docs);

      expect(result).to.deep.equal([{ _id: 'doc-a' }, { _id: 'doc-c' }]);
    });
  });

  describe('getTransitDocIds()', () => {
    it('should return a copy of transit doc IDs', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: { 'doc-1': 'batch-1' },
      });

      await service.loadTransitIndex();

      const ids = service.getTransitDocIds();
      expect(ids.has('doc-1')).to.equal(true);
      expect(ids.size).to.equal(1);

      // Verify it's a copy, not the internal set
      ids.add('extra');
      expect(service.getTransitDocIds().size).to.equal(1);
    });
  });

  describe('refresh()', () => {
    it('should reload transit index', async () => {
      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: { 'doc-1': 'batch-1' },
      });

      await service.loadTransitIndex();
      expect(service.getTransitDocCount()).to.equal(1);

      localDb.get.resolves({
        _id: '_local/p2p-transit-docs',
        transit_index: {
          'doc-1': 'batch-1',
          'doc-2': 'batch-1',
        },
      });

      await service.refresh();

      expect(service.getTransitDocCount()).to.equal(2);
      expect(localDb.get.callCount).to.equal(2);
    });
  });
});
