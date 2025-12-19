import * as Doc from '../../../src/libs/doc';
import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import {
  ddocExists,
  fetchAndFilter,
  fetchAndFilterUuids,
  getDocById,
  getDocsByIds, getDocUuidsByIdRange,
  queryDocsByKey,
  queryDocsByRange, queryDocUuidsByKey, queryDocUuidsByRange, queryNouveauIndex, queryNouveauIndexUuids,
} from '../../../src/local/libs/doc';
import * as LocalDoc from '../../../src/local/libs/doc';
import * as RequestUtils from '../../../src/local/libs/request-utils';
import { expect } from 'chai';
import { Nullable } from '../../../src';
import { DEFAULT_IDS_PAGE_LIMIT } from '../../../src/libs/constants';

describe('local doc lib', () => {
  let dbGet: SinonStub;
  let dbAllDocs: SinonStub;
  let dbQuery: SinonStub;
  let db: PouchDB.Database<Doc.Doc>;
  let isDoc: SinonStub;
  let error: SinonStub;

  beforeEach(() => {
    dbGet = sinon.stub();
    dbAllDocs = sinon.stub();
    dbQuery = sinon.stub();
    db = {
      get: dbGet,
      allDocs: dbAllDocs,
      query: dbQuery
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

  describe('getDocUuidsByIdRange', () => {
    it('returns ids found in the given range', async () => {
      const startkey = 'doc0';
      const endkey = 'doc3';
      dbAllDocs.resolves({
        rows: [
          { id: startkey },
          { id: 'doc1' },
          { id: 'doc2' }
        ]
      });

      const result = await getDocUuidsByIdRange(db)(startkey, endkey);

      expect(result).to.deep.equal([startkey, 'doc1', 'doc2']);
      expect(dbAllDocs).to.be.calledOnceWithExactly({
        startkey,
        endkey,
        include_docs: false,
        limit: undefined,
        skip: 0
      });
    });

    it('returns an empty array if no ids are found', async () => {
      const startkey = 'doc0';
      const endkey = 'doc3';
      dbAllDocs.resolves({ rows: [] });

      const result = await getDocUuidsByIdRange(db)(startkey, endkey);

      expect(result).to.deep.equal([]);
      expect(dbAllDocs).to.be.calledOnceWithExactly({
        startkey,
        endkey,
        include_docs: false,
        limit: undefined,
        skip: 0
      });
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
        skip,
        reduce: false
      })).to.be.true;
      expect(isDoc.args).to.deep.equal([[doc0], [doc1], [doc2]]);
    });

    it('returns empty array if docs are not found', async () => {
      dbQuery.resolves({ rows: [] });
      isDoc.returns(true);

      const result = await queryDocsByKey(db, 'medic-client/contacts_by_type')(contactType, limit, skip);

      expect(result).to.deep.equal([]);
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        include_docs: true, key: contactType, limit, skip, reduce: false
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
        skip,
        reduce: false
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
        skip,
        reduce: false
      })).to.be.true;
    });

    it('returns empty array if docs are not found', async () => {
      dbQuery.resolves({ rows: [] });

      const result = await queryDocUuidsByKey(db, 'medic-client/contacts_by_type')(contactType, limit, skip);

      expect(result).to.deep.equal([]);
      expect(dbQuery.calledOnceWithExactly('medic-client/contacts_by_type', {
        include_docs: false, key: contactType, limit, skip, reduce: false
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

  describe('ddocExists', () => {
    it('should return true when the document exists', async () => {
      // Arrange
      const ddocId = '_design/test-doc';
      const doc = { _id: ddocId, _rev: '1-123', views: {} };
      dbGet.withArgs(ddocId).resolves(doc);

      // Act
      const result = await ddocExists(db, ddocId);

      // Assert
      expect(result).to.be.true;
      expect(dbGet.calledOnceWithExactly(ddocId)).to.be.true;
      expect(error.notCalled).to.be.true;
    });

    it('should return false when the document does not exist', async () => {
      // Arrange
      const ddocId = '_design/non-existent-doc';
      const errorObject = { status: 404, message: 'not_found' };
      dbGet.withArgs(ddocId).rejects(errorObject);

      // Act
      const result = await ddocExists(db, ddocId);

      // Assert
      expect(result).to.be.false;
      expect(dbGet.calledOnceWithExactly(ddocId)).to.be.true;
      expect(error.notCalled).to.be.true;
    });

    it('should return false when an error occurs during get operation', async () => {
      // Arrange
      const ddocId = '_design/some-doc';
      const errorObject = new Error('Connection error');
      dbGet.withArgs(ddocId).rejects(errorObject);

      // Act
      const result = await ddocExists(db, ddocId);

      // Assert
      expect(result).to.be.false;
      expect(dbGet.calledOnce).to.be.true;
      expect(error.calledOnceWithExactly(`Unexpected error while checking ddoc ${ddocId}:`, errorObject)).to.be.true;
    });

    it('should work with different document IDs', async () => {
      // Arrange
      const existingDdocId = '_design/existing';
      const nonExistingDdocId = '_design/non-existing';

      dbGet.withArgs(existingDdocId).resolves({ _id: existingDdocId });
      dbGet.withArgs(nonExistingDdocId).rejects({ status: 404 });

      // Act & Assert
      expect(await ddocExists(db, existingDdocId)).to.be.true;
      expect(await ddocExists(db, nonExistingDdocId)).to.be.false;

      expect(dbGet.calledTwice).to.be.true;
      expect(error.notCalled).to.be.true;
    });
  });

  describe('queryNouveauIndex', () => {
    let fetchStub: sinon.SinonStub;
    let getAuthenticatedFetchStub: sinon.SinonStub;
    let getRequestBodyStub: sinon.SinonStub;
    const requestBody = {
      some: 'body'
    };

    beforeEach(() => {
      fetchStub = sinon.stub();
      getAuthenticatedFetchStub = sinon.stub(RequestUtils, 'getAuthenticatedFetch').returns(fetchStub);
      getRequestBodyStub = sinon.stub(RequestUtils, 'getRequestBody').returns(JSON.stringify(requestBody));
    });

    it('should fetch results and return them without recursion when under limit', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          hits: [{ id: '1' }, { id: '2' }],
          bookmark: 'bookmark1'
        })
      };
      fetchStub.resolves(mockResponse);

      // Act
      const queryFunction = queryNouveauIndex(db, viewName);
      const result = await queryFunction(params);

      // Assert
      expect(getAuthenticatedFetchStub.calledOnceWith(db, viewName)).to.be.true;
      expect(fetchStub.calledOnceWith({
        method: 'POST',
        body: JSON.stringify(requestBody)
      })).to.be.true;
      expect(getRequestBodyStub.calledOnceWith(viewName, params, null)).to.be.true;
      expect(result).to.deep.equal({
        data: [{ id: '1' }, { id: '2' }],
        cursor: 'bookmark1'
      });
    });

    it('should recursively fetch all results when hitting page limit', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };

      // First response with page limit number of results
      const mockResponse1 = {
        ok: true,
        json: sinon.stub().resolves({
          hits: Array(DEFAULT_IDS_PAGE_LIMIT).fill(0).map((_, i) => ({ id: `first-${String(i)}` })),
          bookmark: 'bookmark1'
        })
      };

      // Second response with fewer results (last page)
      const mockResponse2 = {
        ok: true,
        json: sinon.stub().resolves({
          hits: [{ id: 'last-1' }, { id: 'last-2' }],
          bookmark: 'bookmark2'
        })
      };

      // Setup fetch to return different responses on consecutive calls
      fetchStub.onFirstCall().resolves(mockResponse1);
      fetchStub.onSecondCall().resolves(mockResponse2);

      // Act
      const queryFunction = queryNouveauIndex(db, viewName);
      const result = await queryFunction(params);

      // Assert
      expect(getAuthenticatedFetchStub.calledOnceWith(db, viewName)).to.be.true;
      expect(fetchStub.calledTwice).to.be.true;
      expect(getRequestBodyStub.firstCall.args).to.deep.equal([viewName, params, null]);
      expect(getRequestBodyStub.secondCall.args).to.deep.equal([viewName, params, 'bookmark1']);

      // The result should contain all items from both responses
      expect(result.data.length).to.equal(DEFAULT_IDS_PAGE_LIMIT + 2);
      expect(result.data[0].id).to.equal('first-0');
      expect(result.data[DEFAULT_IDS_PAGE_LIMIT]).to.deep.equal({ id: 'last-1' });
      expect(result.cursor).to.equal('bookmark2');
    });

    it('should throw an error when the fetch response is not ok', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };
      const mockResponse = {
        ok: false,
        statusText: 'Internal Server Error'
      };
      fetchStub.resolves(mockResponse);

      // Act & Assert
      const queryFunction = queryNouveauIndex(db, viewName);
      await expect(queryFunction(params)).to.be.rejectedWith('Internal Server Error');

      expect(getAuthenticatedFetchStub.calledOnceWith(db, viewName)).to.be.true;
      expect(fetchStub.calledOnce).to.be.true;
      expect(getRequestBodyStub.calledOnceWith(viewName, params, null)).to.be.true;
    });

    it('should pass bookmark to subsequent calls when recursively fetching', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };
      const initialBookmark = 'initial-bookmark';

      // First response with page limit number of results
      const mockResponse1 = {
        ok: true,
        json: sinon.stub().resolves({
          hits: Array(DEFAULT_IDS_PAGE_LIMIT).fill(0).map((_, i) => ({ id: `page1-${String(i)}` })),
          bookmark: 'bookmark1'
        })
      };

      // Second response with fewer results (last page)
      const mockResponse2 = {
        ok: true,
        json: sinon.stub().resolves({
          hits: [{ id: 'page2-1' }],
          bookmark: 'final-bookmark'
        })
      };

      fetchStub.onFirstCall().resolves(mockResponse1);
      fetchStub.onSecondCall().resolves(mockResponse2);

      // Act
      const queryFunction = queryNouveauIndex(db, viewName);
      const result = await queryFunction(params, [], initialBookmark);

      // Assert
      expect(fetchStub.calledTwice).to.be.true;
      expect(getRequestBodyStub.firstCall.args).to.deep.equal([viewName, params, initialBookmark]);
      expect(getRequestBodyStub.secondCall.args).to.deep.equal([viewName, params, 'bookmark1']);

      expect(result.data.length).to.equal(DEFAULT_IDS_PAGE_LIMIT + 1);
      expect(result.cursor).to.equal('final-bookmark');
    });

    it('should handle empty results from the server', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };
      const mockResponse = {
        ok: true,
        json: sinon.stub().resolves({
          hits: [],
          bookmark: 'empty-bookmark'
        })
      };

      fetchStub.resolves(mockResponse);

      // Act
      const queryFunction = queryNouveauIndex(db, viewName);
      const result = await queryFunction(params);

      // Assert
      expect(fetchStub.calledOnce).to.be.true;
      expect(result).to.deep.equal({
        data: [],
        cursor: 'empty-bookmark'
      });
    });
  });

  describe('queryNouveauIndexUuids', () => {
    let queryNouveauIndexInner: SinonStub;
    let queryNouveauIndexOuter: SinonStub;

    beforeEach(() => {
      queryNouveauIndexInner = sinon.stub();
      queryNouveauIndexOuter = sinon.stub(LocalDoc, 'queryNouveauIndex').returns(queryNouveauIndexInner);
    });

    it('should call queryNouveauIndex and extract ids from results', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };

      const mockQueryResult = {
        data: [
          { id: 'doc1', value: 'value1' },
          { id: 'doc2', value: 'value2' },
          { id: 'doc3', value: 'value3' }
        ],
        cursor: 'test-bookmark'
      };

      queryNouveauIndexInner.withArgs(params).resolves(mockQueryResult);

      // Act
      const uuidsQuery = queryNouveauIndexUuids(db, viewName);
      const result = await uuidsQuery(params);

      // Assert
      expect(queryNouveauIndexOuter.calledOnceWith(db, viewName)).to.be.true;
      expect(queryNouveauIndexInner.calledOnceWith(params)).to.be.true;

      expect(result).to.deep.equal({
        data: ['doc1', 'doc2', 'doc3'],
        cursor: 'test-bookmark'
      });
    });

    it('should handle empty results from queryNouveauIndex', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };

      const mockQueryResult = {
        data: [],
        cursor: 'empty-bookmark'
      };

      queryNouveauIndexInner.withArgs(params).resolves(mockQueryResult);

      // Act
      const uuidsQuery = queryNouveauIndexUuids(db, viewName);
      const result = await uuidsQuery(params);

      // Assert
      expect(queryNouveauIndexOuter.calledOnceWith(db, viewName)).to.be.true;
      expect(queryNouveauIndexInner.calledOnceWith(params)).to.be.true;

      expect(result).to.deep.equal({
        data: [],
        cursor: 'empty-bookmark'
      });
    });

    it('should preserve cursor when mapping results', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };

      const mockQueryResult = {
        data: [{ id: 'single-doc' }],
        cursor: 'specific-bookmark'
      };

      queryNouveauIndexInner.withArgs(params).resolves(mockQueryResult);

      // Act
      const uuidsQuery = queryNouveauIndexUuids(db, viewName);
      const result = await uuidsQuery(params);

      // Assert
      expect(result.cursor).to.equal('specific-bookmark');
    });

    it('should pass through errors from queryNouveauIndex', async () => {
      // Arrange
      const viewName = 'test-view';
      const params = { key: 'value' };
      const error = new Error('Database error');

      queryNouveauIndexInner.withArgs(params).rejects(error);

      // Act & Assert
      const uuidsQuery = queryNouveauIndexUuids(db, viewName);
      await expect(uuidsQuery(params)).to.be.rejectedWith(error);

      expect(queryNouveauIndexOuter.calledOnceWith(db, viewName)).to.be.true;
      expect(queryNouveauIndexInner.calledOnceWith(params)).to.be.true;
    });

    it('should work with different viewNames', async () => {
      // Arrange
      const viewName1 = 'view1';
      const viewName2 = 'view2';
      const params = { key: 'value' };

      const queryNouveauIndexInner1 = sinon.stub().resolves({
        data: [{ id: 'doc1-view1' }],
        cursor: 'bookmark1'
      });

      const queryNouveauIndexInner2 = sinon.stub().resolves({
        data: [{ id: 'doc1-view2' }],
        cursor: 'bookmark2'
      });

      queryNouveauIndexOuter.withArgs(db, viewName1).returns(queryNouveauIndexInner1);
      queryNouveauIndexOuter.withArgs(db, viewName2).returns(queryNouveauIndexInner2);

      // Act
      const uuidsQuery1 = queryNouveauIndexUuids(db, viewName1);
      const uuidsQuery2 = queryNouveauIndexUuids(db, viewName2);

      const result1 = await uuidsQuery1(params);
      const result2 = await uuidsQuery2(params);

      // Assert
      expect(queryNouveauIndexOuter.calledTwice).to.be.true;
      expect(queryNouveauIndexOuter.calledWith(db, viewName1)).to.be.true;
      expect(queryNouveauIndexOuter.calledWith(db, viewName2)).to.be.true;

      expect(result1.data).to.deep.equal(['doc1-view1']);
      expect(result2.data).to.deep.equal(['doc1-view2']);
    });
  });
});
