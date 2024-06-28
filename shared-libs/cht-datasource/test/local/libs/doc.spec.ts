import * as Doc from '../../../src/libs/doc';
import sinon, { SinonStub } from 'sinon';
import logger from '@medic/logger';
import { getDocById, getDocsByIds, queryDocsByKey } from '../../../src/local/libs/doc';
import { expect } from 'chai';

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

  describe('queryDocsByKey', () => {
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

      const result = await queryDocsByKey(db, 'medic-client/docs_by_id_lineage')(doc0._id);

      expect(result).to.deep.equal([doc0, doc1, doc2]);
      expect(dbQuery.calledOnceWithExactly('medic-client/docs_by_id_lineage', {
        startkey: [doc0._id],
        endkey: [doc0._id, {}],
        include_docs: true
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

      const result = await queryDocsByKey(db, 'medic-client/docs_by_id_lineage')(doc0._id);

      expect(result).to.deep.equal([doc0, null, doc2]);
      expect(dbQuery.calledOnceWithExactly('medic-client/docs_by_id_lineage', {
        startkey: [doc0._id],
        endkey: [doc0._id, {}],
        include_docs: true
      })).to.be.true;
      expect(isDoc.args).to.deep.equal([[doc0], [null], [doc2]]);
    });

    it('returns null if the returned object is not a doc', async () => {
      const doc0 = { _id: 'doc0' };
      dbQuery.resolves({
        rows: [{ doc: doc0 }]
      });
      isDoc.returns(false);

      const result = await queryDocsByKey(db, 'medic-client/docs_by_id_lineage')(doc0._id);

      expect(result).to.deep.equal([null]);
      expect(dbQuery.calledOnceWithExactly('medic-client/docs_by_id_lineage', {
        startkey: [doc0._id],
        endkey: [doc0._id, {}],
        include_docs: true
      })).to.be.true;
      expect(isDoc.calledOnceWithExactly(doc0)).to.be.true;
    });
  });
});
