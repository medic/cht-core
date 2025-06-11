import * as Doc from '../../../src/libs/doc';
import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import {
  fetchAndFilter,
  fetchAndFilterUuids,
  getDocById,
  getDocsByIds,
  queryDocsByKey,
  queryDocsByRange, queryDocUuidsByKey, queryDocUuidsByRange,
  createDoc
} from '../../../src/local/libs/doc';
import * as LocalDoc from '../../../src/local/libs/doc';
import { expect } from 'chai';
import { Nullable } from '../../../src';

describe('local doc lib', () => {
  let dbGet: SinonStub;
  let dbAllDocs: SinonStub;
  let dbQuery: SinonStub;
  let dbPost: SinonStub;
  let db: PouchDB.Database<Doc.Doc>;
  let isDoc: SinonStub;
  let error: SinonStub;

  beforeEach(() => {
    dbGet = sinon.stub();
    dbAllDocs = sinon.stub();
    dbQuery = sinon.stub();
    dbPost = sinon.stub();
    db = {
      get: dbGet,
      allDocs: dbAllDocs,
      query: dbQuery,
      post: dbPost
    } as unknown as PouchDB.Database<Doc.Doc>;
    isDoc = sinon.stub(Doc, 'isDoc');
    error = sinon.stub(logger, 'error');
  });

  afterEach(() => sinon.restore());

  describe('getDocById', () => {
    it('returns a doc by id', async () => {
      const uuid = 'uuid';
      const doc = { type: 'doc' };
      dbGet.resolves(doc);
      isDoc.returns(true);

      const result = await getDocById(db)(uuid);

      expect(result).to.equal(doc);
      expect(dbGet.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc)).to.be.true;
    });

    it('returns null if the result is not a doc', async () => {
      const uuid = 'uuid';
      const doc = { type: 'not-doc' };
      dbGet.resolves(doc);
      isDoc.returns(false);

      const result = await getDocById(db)(uuid);

      expect(result).to.be.null;
      expect(dbGet.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc)).to.be.true;
    });

    it('returns null if the doc is not found', async () => {
      const uuid = 'uuid';
      dbGet.rejects({ status: 404 });

      const result = await getDocById(db)(uuid);

      expect(result).to.be.null;
      expect(dbGet.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.notCalled).to.be.true;
      expect(error.notCalled).to.be.true;
    });

    it('throws an error if an unexpected error occurs', async () => {
      const uuid = 'uuid';
      const err = new Error('unexpected error');
      dbGet.rejects(err);

      await expect(getDocById(db)(uuid)).to.be.rejectedWith(err);

      expect(dbGet.calledOnceWithExactly(uuid)).to.be.true;
      expect(isDoc.notCalled).to.be.true;
      expect(error.calledOnceWithExactly(`Failed to fetch doc with id [${uuid}]`, err)).to.be.true;
    });
  });

  describe('getDocsByIds', () => {
    it('returns docs for the given ids', async () => {
      const doc0 = { _id: 'doc0' };
      const doc1 = { _id: 'doc1' };
      const doc2 = { _id: 'doc2' };
      const ids = [doc0._id, doc1._id, doc2._id];
      dbAllDocs.resolves({
        rows: [
          { doc: doc0 },
          { doc: doc1 },
          { doc: doc2 }
        ]
      });
      isDoc.returns(true);

      const result = await getDocsByIds(db)(ids);

      expect(result).to.deep.equal([doc0, doc1, doc2]);
      expect(dbAllDocs.calledOnceWithExactly({ keys: ids, include_docs: true })).to.be.true;
      expect(isDoc.args).to.deep.equal([[doc0], [doc1], [doc2]]);
    });

    it('returns an empty array if no ids are provided', async () => {
      const result = await getDocsByIds(db)([]);

      expect(result).to.deep.equal([]);
      expect(dbAllDocs.notCalled).to.be.true;
      expect(isDoc.notCalled).to.be.true;
    });

    it('does not return an entry for a blank id', async () => {
      const result = await getDocsByIds(db)(['']);

      expect(result).to.deep.equal([]);
      expect(dbAllDocs.notCalled).to.be.true;
      expect(isDoc.notCalled).to.be.true;
    });

    it('does not return an entry that is not a doc', async () => {
      const doc0 = { _id: 'doc0' };
      const ids = [doc0._id];
      dbAllDocs.resolves({
        rows: [
          { doc: doc0 },
        ]
      });
      isDoc.returns(false);

      const result = await getDocsByIds(db)(ids);

      expect(result).to.deep.equal([]);
      expect(dbAllDocs.calledOnceWithExactly({ keys: ids, include_docs: true })).to.be.true;
      expect(isDoc.args).to.deep.equal([[doc0]]);
    });

    it('returns one entry when duplicate ids are provided', async () => {
      const doc0 = { _id: 'doc0' };
      dbAllDocs.resolves({
        rows: [{ doc: doc0 }]
      });
      isDoc.returns(true);

      const result = await getDocsByIds(db)([doc0._id, doc0._id]);

      expect(result).to.deep.equal([doc0]);
      expect(dbAllDocs.calledOnceWithExactly({ keys: [doc0._id], include_docs: true })).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc0)).to.be.true;
    });
  });

  describe('queryDocsByRange', () => {
    const limit = 3;
    const skip = 2;

    it('returns lineage docs for the given id', async () => {
      const doc0 = { _id: 'doc0' };
      const doc1 = { _id: 'doc1' };
      const doc2 = { _id: 'doc2' };
      dbQuery.resolves({
        rows: [
          { doc: doc0 },
          { doc: doc1 },
          { doc: doc2 }
        ]
      });
      isDoc.returns(true);

      const result = await queryDocsByRange(db, 'medic-client/docs_by_id_lineage')(doc0._id, doc1._id);

      expect(result).to.deep.equal([doc0, doc1, doc2]);

      expect(dbQuery.calledOnceWithExactly('medic-client/docs_by_id_lineage', {
        include_docs: true,
        startkey: doc0._id,
        endkey: doc1._id,
        limit: undefined,
        skip: 0
      })).to.be.true;
      expect(isDoc.args).to.deep.equal([[doc0], [doc1], [doc2]]);
    });

    it('returns null if a doc in the lineage is not found', async () => {
      const doc0 = { _id: 'doc0' };
      const doc2 = { _id: 'doc2' };
      dbQuery.resolves({
        rows: [
          { doc: doc0 },
          { doc: null },
          { doc: doc2 }
        ]
      });
      isDoc.returns(true);

      const result = await queryDocsByRange(db, 'medic-client/docs_by_id_lineage')(doc0._id, doc2._id, limit, skip);

      expect(result).to.deep.equal([doc0, null, doc2]);
      expect(dbQuery.calledOnceWithExactly('medic-client/docs_by_id_lineage', {
        startkey: doc0._id,
        endkey: doc2._id,
        include_docs: true,
        limit,
        skip,
      })).to.be.true;
      expect(isDoc.args).to.deep.equal([[doc0], [null], [doc2]]);
    });

    it('returns null if the returned object is not a doc', async () => {
      const doc0 = { _id: 'doc0' };
      dbQuery.resolves({
        rows: [{ doc: doc0 }]
      });
      isDoc.returns(false);

      const result = await queryDocsByRange(db, 'medic-client/docs_by_id_lineage')(doc0._id, doc0._id, limit, skip);

      expect(result).to.deep.equal([null]);
      expect(dbQuery.calledOnceWithExactly('medic-client/docs_by_id_lineage', {
        startkey: doc0._id,
        endkey: doc0._id,
        include_docs: true,
        limit,
        skip
      })).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc0)).to.be.true;
    });
  });

  describe('queryDocsByKey', () => {
    const limit = 100;
    const skip = 0;
    const contactType = 'person';

    it('returns docs on the basis of given key in pages', async () => {
      const doc0 = { _id: 'doc0' };
      const doc1 = { _id: 'doc1' };
      const doc2 = { _id: 'doc2' };

      dbQuery.resolves({
        rows: [
          { doc: doc0 },
          { doc: doc1 },
          { doc: doc2 }
        ]
      });
      isDoc.returns(true);

      const result = await queryDocsByKey(db, 'medic-client/contacts_by_type')(contactType, limit, skip);

      expect(result).to.deep.equal([doc0, doc1, doc2]);
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        include_docs: true,
        key: contactType,
        limit,
        skip
      })).to.be.true;
      expect(isDoc.args).to.deep.equal([[doc0], [doc1], [doc2]]);
    });

    it('returns empty array if docs are not found', async () => {
      dbQuery.resolves({ rows: [] });
      isDoc.returns(true);

      const result = await queryDocsByKey(db, 'medic-client/contacts_by_type')(contactType, limit, skip);

      expect(result).to.deep.equal([]);
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        include_docs: true, key: contactType, limit, skip
      })).to.be.true;
      expect(isDoc.args).to.deep.equal([]);
    });

    it('returns null valued array if rows from database are not docs', async () => {
      const doc0 = { _id: 'doc0' };

      dbQuery.resolves({
        rows: [
          { doc: doc0 },
        ]
      });
      isDoc.returns(false);

      const result = await queryDocsByKey(db, 'medic-client/contacts_by_type')(contactType, limit, skip);

      expect(result).to.deep.equal([null]);
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        include_docs: true,
        key: contactType,
        limit,
        skip
      })).to.be.true;
      expect(isDoc.args).to.deep.equal([[doc0]]);
    });
  });

  describe('queryDocUuidsByRange', () => {
    const limit = 3;
    const skip = 2;

    it('returns docs uuids for the given keys', async () => {
      const doc0 = { id: 'doc0' };
      const doc1 = { id: 'doc1' };
      const doc2 = { id: 'doc2' };
      dbQuery.resolves({
        rows: [
          { ...doc0 },
          { ...doc1 },
          { ...doc2 }
        ]
      });

      const result = await queryDocUuidsByRange(db, 'medic-client/contacts_by_type')(doc0.id, doc1.id);

      expect(result).to.deep.equal([doc0.id, doc1.id, doc2.id]);

      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        include_docs: false,
        startkey: doc0.id,
        endkey: doc1.id,
        limit: undefined,
        skip: 0
      })).to.be.true;
    });

    it('returns empty array if no doc is found', async () => {
      const doc0 = { _id: 'doc0' };
      const doc1 = { _id: 'doc1' };
      dbQuery.resolves({
        rows: []
      });

      const result = await queryDocUuidsByRange(db, 'medic-client/contacts_by_type')(doc0._id, doc1._id, limit, skip);

      expect(result).to.deep.equal([]);
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        startkey: doc0._id,
        endkey: doc1._id,
        include_docs: false,
        limit,
        skip
      })).to.be.true;
    });
  });

  describe('queryDocUuidsByKey', () => {
    const limit = 100;
    const skip = 0;
    const contactType = 'person';

    it('returns doc uuids based on key in pages', async () => {
      const doc0 = { id: 'doc0' };
      const doc1 = { id: 'doc1' };
      const doc2 = { id: 'doc2' };

      dbQuery.resolves({
        rows: [
          { ...doc0 },
          { ...doc1 },
          { ...doc2 }
        ]
      });

      const result = await queryDocUuidsByKey(db, 'medic-client/contacts_by_type')(contactType, limit, skip);

      expect(result).to.deep.equal([doc0.id, doc1.id, doc2.id]);
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        include_docs: false,
        key: contactType,
        limit,
        skip
      })).to.be.true;
    });

    it('returns empty array if docs are not found', async () => {
      dbQuery.resolves({ rows: [] });

      const result = await queryDocUuidsByKey(db, 'medic-client/contacts_by_type')(contactType, limit, skip);

      expect(result).to.deep.equal([]);
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        include_docs: false, key: contactType, limit, skip
      })).to.be.true;
    });
  });

  describe('fetchAndFilter', () => {
    let getFunction: sinon.SinonStub;
    let filterFunction: sinon.SinonStub;

    beforeEach(() => {
      getFunction = sinon.stub();
      filterFunction = sinon.stub();
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return correct data when all docs are valid', async () => {
      const docs = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
      getFunction.resolves(docs);
      filterFunction.returns(true);

      const fetchAndFilterFunc = fetchAndFilter(getFunction, filterFunction, 3);
      const result = await fetchAndFilterFunc(3, 0);

      expect(result.data).to.deep.equal(docs);
      expect(result.cursor).to.equal('3');
      expect(getFunction.calledOnceWith(3, 0)).to.be.true;
      expect(filterFunction.callCount).to.equal(3);
    });

    it('should filter out invalid docs and fetch more if needed', async () => {
      const docs1 = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
      const docs2 = [{ _id: '4' }, { _id: '5' }];
      getFunction.onFirstCall().resolves(docs1);
      getFunction.onSecondCall().resolves(docs2);
      filterFunction.callsFake((doc: Doc.Doc) => doc._id !== '2');

      const fetchAndFilterFunc = fetchAndFilter(getFunction, filterFunction, 3);
      const result = await fetchAndFilterFunc(3, 0);

      expect(result.data).to.deep.equal([{ _id: '1' }, { _id: '3' }, { _id: '4' }]);
      expect(result.cursor).to.equal('4');
      expect(getFunction.firstCall.calledWith(3, 0)).to.be.true;
      expect(getFunction.secondCall.calledWith(2, 3)).to.be.true;
      expect(filterFunction.callCount).to.equal(5);
    });

    it('should return null cursor when no more results', async () => {
      const docs = [{ _id: '1' }, { _id: '2' }];
      getFunction.resolves(docs);
      filterFunction.returns(true);

      const fetchAndFilterFunc = fetchAndFilter(getFunction, filterFunction, 3);
      const result = await fetchAndFilterFunc(3, 0);

      expect(result.data).to.deep.equal(docs);
      expect(result.cursor).to.be.null;
      expect(getFunction.calledOnceWith(3, 0)).to.be.true;
      expect(filterFunction.callCount).to.equal(2);
    });

    it('should handle empty result set', async () => {
      getFunction.resolves([]);
      filterFunction.returns(true);

      const fetchAndFilterFunc = fetchAndFilter(getFunction, filterFunction, 3);
      const result = await fetchAndFilterFunc(3, 0);

      expect(result.data).to.deep.equal([]);
      expect(result.cursor).to.be.null;
      expect(getFunction.calledOnceWith(3, 0)).to.be.true;
      expect(filterFunction.callCount).to.equal(0);
    });

    it('should handle all docs being filtered out', async () => {
      const docs1 = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
      const docs2 = [{ _id: '4' }, { _id: '5' }, { _id: '6' }];
      getFunction.onFirstCall().resolves(docs1);
      getFunction.onSecondCall().resolves(docs2);
      filterFunction.returns(false);

      const fetchAndFilterFunc = fetchAndFilter(getFunction, filterFunction, 3);
      const result = await fetchAndFilterFunc(3, 0);

      expect(result.data).to.deep.equal([]);
      expect(result.cursor).to.be.null;
      expect(getFunction.firstCall.calledWith(3, 0)).to.be.true;
      expect(getFunction.secondCall.calledWith(6, 3)).to.be.true;
      expect(filterFunction.callCount).to.equal(6);
    });
  });

  describe('fetchAndFilterUuids', () => {
    let fetchAndFilterStub: sinon.SinonStub;

    beforeEach(() => {
      fetchAndFilterStub = sinon.stub(LocalDoc, 'fetchAndFilter');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should filter out duplicate UUIDs', () => {
      const uuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174000',
        '987fcdeb-51a2-43d7-9b56-254125174000'
      ];

      const getFunction = sinon.stub();
      getFunction.resolves(uuids);

      // Mock fetchAndFilter to be able to test the inner filter function
      const fetchAndFilterStubFake = fetchAndFilterStub
        .callsFake(<T>(
          fn: (limit: number, skip: number) => Promise<Nullable<T>[]>,
          filterFn: (doc: Nullable<string>) => boolean
        ) => {
          const results: string[] = [];
          for (const uuid of uuids) {
            if (filterFn(uuid)) {
              results.push(uuid);
            }
          }
          return results;
        });

      const result =  fetchAndFilterUuids(getFunction, 3);

      expect(result).to.have.members(['123e4567-e89b-12d3-a456-426614174000', '987fcdeb-51a2-43d7-9b56-254125174000']);
      expect(fetchAndFilterStubFake.calledOnce).to.be.true;
    });

    it('should filter out null values', () => {
      const uuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        null,
        '987fcdeb-51a2-43d7-9b56-254125174000'
      ] as (string | null)[];

      const getFunction = sinon.stub();
      getFunction.resolves(uuids);

      fetchAndFilterStub
        .callsFake(<T>(
          fn: (limit: number, skip: number) => Promise<Nullable<T>[]>,
          filterFn: (doc: Nullable<string>) => boolean
        ) => {
          const results: string[] = [];
          for (const uuid of uuids) {
            if (filterFn(uuid)) {
              results.push(uuid!);
            }
          }
          return results;
        });

      const result = fetchAndFilterUuids(getFunction, 3);

      expect(result).to.have.length(2);
      expect(result).to.not.include(null);
    });

    it('should respect the limit parameter', () => {
      const getFunction = sinon.stub();
      const limit = 2;

      fetchAndFilterStub
        .callsFake( (fn, filterFn, passedLimit) => {
          expect(passedLimit).to.equal(limit);
          return [];
        });

      fetchAndFilterUuids(getFunction, limit);
    });

    it('should handle empty results', () => {
      const getFunction = sinon.stub();
      getFunction.resolves([]);

      fetchAndFilterStub
        .returns([]);

      const result = fetchAndFilterUuids(getFunction, 3);

      expect(result).to.be.an('array').that.is.empty;
    });

    it('should propagate errors from getFunction', () => {
      const error = new Error('API Error');
      const getFunction = sinon.stub();

      fetchAndFilterStub.throws(error);

      expect(() => fetchAndFilterUuids(getFunction, 3)).to.throw('API Error');
    });
  });

  describe('createDoc', () => {
    const doc = {
      type: 'contact',
      contact_type: 'person',
      name: 'Medic User',
      parent: {
        _id: '2-id'
      }
    };

    const createdDoc = {
      type: 'contact',
      contact_type: 'person',
      name: 'Medic User',
      reported_date: 12312312,
      _rev: '1-rev',
      _id: '1-id',
      parent: {
        _id: '2-id'
      }
    };
    
    it('should create and retrieve the doc', async () => {
      dbPost.resolves({ id: '1-id', ok: true });
      isDoc.returns(true);
      dbGet.resolves(createdDoc);

      const result = await createDoc(db)(doc);

      expect(result).to.equal(createdDoc);
      expect(dbGet.calledOnceWithExactly(createdDoc._id)).to.be.true;
    });

    it('case when database returns false for ok', async () => {
      dbPost.resolves({ id: '1-id', ok: false });
      await expect(createDoc(db)(doc)).to.be.rejectedWith('Error creating document.');
      expect(dbPost.calledOnceWithExactly(doc)).to.be.true;
    });
  });

});
