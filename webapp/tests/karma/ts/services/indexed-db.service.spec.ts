import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import sinon from 'sinon';
import { expect } from 'chai';

import { DbService } from '@mm-services/db.service';
import { IndexedDbService } from '@mm-services/indexed-db.service';

describe('IndexedDbService', () => {
  let service: IndexedDbService;
  let dbService;
  let metaDb;
  let documentMock;

  beforeEach(() => {
    metaDb = {
      put: sinon.stub(),
      get: sinon.stub(),
    };
    dbService = {
      get: sinon.stub().withArgs({ meta: true }).returns(metaDb)
    };
    documentMock = {
      defaultView: {
        indexedDB: { databases: null },
      },
      querySelectorAll: sinon.stub().returns([]),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: DOCUMENT, useValue: documentMock },
      ],
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getDatabaseNames', () => {
    it('should do return list of database names when browser supports databases() function', async () => {
      documentMock.defaultView.indexedDB.databases = sinon.stub();
      documentMock.defaultView.indexedDB.databases.resolves([
        { name: 'db-1' },
        { name: 'db-2' },
      ]);
      service = TestBed.inject(IndexedDbService);

      const dbNames = await service.getDatabaseNames();

      expect(documentMock.defaultView.indexedDB.databases.calledOnce).to.be.true;
      expect(dbNames).to.have.members([ 'db-1', 'db-2' ]);
    });

    it('should return list of database names', async () => {
      metaDb.get.resolves({
        db_names: [ 'db-a', 'db-b', 'db-c' ],
      });
      service = TestBed.inject(IndexedDbService);

      const dbNames = await service.getDatabaseNames();

      expect(dbNames).to.have.members([ 'db-a', 'db-b', 'db-c' ]);
    });

    it('should return empty array if no db_names in local doc', async () => {
      metaDb.get.resolves({ db_names: [] });
      service = TestBed.inject(IndexedDbService);

      const dbNames = await service.getDatabaseNames();

      expect(dbNames?.length).to.equal(0);
    });
  });

  describe('saveDatabaseName', () => {
    it('should do nothing when browser supports databases() function', async () => {
      documentMock.defaultView.indexedDB.databases = sinon.stub();
      documentMock.defaultView.indexedDB.databases.resolves([
        { name: 'db-1' },
        { name: 'db-2' },
      ]);
      service = TestBed.inject(IndexedDbService);

      await service.saveDatabaseName('db-new');

      expect(documentMock.defaultView.indexedDB.databases.notCalled).to.be.true;
      expect(metaDb.get.notCalled).to.be.true;
      expect(metaDb.put.notCalled).to.be.true;
    });

    it('should do nothing when name already exists', async () => {
      metaDb.get.resolves({
        db_names: [ 'db-a', 'db-b', 'db-c' ],
      });
      service = TestBed.inject(IndexedDbService);

      await service.saveDatabaseName('db-b');

      expect(metaDb.get.calledOnce).to.be.true;
      expect(metaDb.put.notCalled).to.be.true;
    });

    it('should save name when it is new', async () => {
      metaDb.get.resolves({
        _id: '_local/indexeddb-placeholder',
        db_names: [ 'db-a', 'db-b', 'db-c' ],
      });
      service = TestBed.inject(IndexedDbService);

      await service.saveDatabaseName('db-new');

      expect(metaDb.get.calledOnce).to.be.true;
      expect(metaDb.put.calledOnce).to.be.true;
      expect(metaDb.put.args[0][0]).to.deep.equal({
        _id: '_local/indexeddb-placeholder',
        db_names: [ 'db-a', 'db-b', 'db-c', 'db-new' ],
      });
    });
  });

  describe('deleteDatabaseName', () => {
    it('should do nothing when browser supports databases() function', async () => {
      documentMock.defaultView.indexedDB.databases = sinon.stub();
      documentMock.defaultView.indexedDB.databases.resolves([
        { name: 'db-1' },
        { name: 'db-2' },
      ]);
      service = TestBed.inject(IndexedDbService);

      await service.deleteDatabaseName('db-1');

      expect(documentMock.defaultView.indexedDB.databases.notCalled).to.be.true;
      expect(metaDb.get.notCalled).to.be.true;
      expect(metaDb.put.notCalled).to.be.true;
    });

    it('should do nothing when name not found', async () => {
      metaDb.get.resolves({
        db_names: [ 'db-a', 'db-b', 'db-c' ],
      });
      service = TestBed.inject(IndexedDbService);

      await service.deleteDatabaseName('db-other');

      expect(metaDb.get.calledOnce).to.be.true;
      expect(metaDb.put.notCalled).to.be.true;
    });

    it('should do nothing when db_names in local doc is empty', async () => {
      metaDb.get.resolves({ db_names: [] });
      service = TestBed.inject(IndexedDbService);

      await service.deleteDatabaseName('db-b');

      expect(metaDb.get.calledOnce).to.be.true;
      expect(metaDb.put.notCalled).to.be.true;
    });

    it('should delete name when it exists in db_names', async () => {
      metaDb.get.resolves({
        _id: '_local/indexeddb-placeholder',
        db_names: [ 'db-a', 'db-b', 'db-c' ],
      });
      service = TestBed.inject(IndexedDbService);

      await service.deleteDatabaseName('db-b');

      expect(metaDb.get.calledOnce).to.be.true;
      expect(metaDb.put.calledOnce).to.be.true;
      expect(metaDb.put.args[0][0]).to.deep.equal({
        _id: '_local/indexeddb-placeholder',
        db_names: [ 'db-a', 'db-c' ],
      });
    });
  });
});
