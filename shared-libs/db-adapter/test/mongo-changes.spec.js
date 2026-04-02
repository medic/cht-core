const { expect } = require('chai');
const sinon = require('sinon');
const {
  createChangesFeed,
  recordChange,
  recordChanges,
  getCurrentSeq,
  CHANGELOG_COLLECTION,
} = require('../src/mongo/mongo-changes');

const createMockDb = () => {
  const collections = {};

  const getCollection = (name) => {
    if (!collections[name]) {
      collections[name] = {
        insertOne: sinon.stub().resolves(),
        insertMany: sinon.stub().resolves(),
        findOne: sinon.stub().resolves(null),
        findOneAndUpdate: sinon.stub(),
        find: sinon.stub(),
        createIndex: sinon.stub().resolves(),
        collectionName: name,
      };
    }
    return collections[name];
  };

  return {
    collection: sinon.stub().callsFake(getCollection),
    _collections: collections,
  };
};

const createMockDocsCollection = () => ({
  watch: sinon.stub(),
  findOne: sinon.stub(),
  collectionName: 'docs',
});

describe('mongo-changes', () => {
  afterEach(() => sinon.restore());

  describe('recordChange', () => {
    it('should insert a changelog entry with auto-incremented seq', async () => {
      const db = createMockDb();
      db._collections['_counters'] = {
        findOneAndUpdate: sinon.stub().resolves({ value: 1 }),
      };
      db.collection.withArgs('_counters').returns(db._collections['_counters']);

      const changelogCol = { insertOne: sinon.stub().resolves() };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      const seq = await recordChange(db, 'doc1', '1-abc', false);

      expect(seq).to.equal(1);
      expect(changelogCol.insertOne.calledOnce).to.be.true;
      const entry = changelogCol.insertOne.args[0][0];
      expect(entry._seq).to.equal(1);
      expect(entry.id).to.equal('doc1');
      expect(entry.rev).to.equal('1-abc');
      expect(entry.deleted).to.be.false;
      expect(entry.timestamp).to.be.instanceOf(Date);
    });

    it('should record deleted changes', async () => {
      const db = createMockDb();
      db._collections['_counters'] = {
        findOneAndUpdate: sinon.stub().resolves({ value: 5 }),
      };
      db.collection.withArgs('_counters').returns(db._collections['_counters']);

      const changelogCol = { insertOne: sinon.stub().resolves() };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      await recordChange(db, 'doc2', '2-def', true);

      const entry = changelogCol.insertOne.args[0][0];
      expect(entry.deleted).to.be.true;
    });
  });

  describe('recordChanges', () => {
    it('should batch insert changelog entries', async () => {
      const db = createMockDb();
      db._collections['_counters'] = {
        findOneAndUpdate: sinon.stub().resolves({ value: 5 }),
      };
      db.collection.withArgs('_counters').returns(db._collections['_counters']);

      const changelogCol = { insertMany: sinon.stub().resolves() };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      await recordChanges(db, [
        { id: 'a', rev: '1-a', deleted: false },
        { id: 'b', rev: '1-b', deleted: false },
        { id: 'c', rev: '2-c', deleted: true },
      ]);

      expect(changelogCol.insertMany.calledOnce).to.be.true;
      const docs = changelogCol.insertMany.args[0][0];
      expect(docs).to.have.length(3);
      // Batch starts at (5 - 3 + 1) = 3
      expect(docs[0]._seq).to.equal(3);
      expect(docs[1]._seq).to.equal(4);
      expect(docs[2]._seq).to.equal(5);
      expect(docs[2].deleted).to.be.true;
    });

    it('should do nothing for empty changes', async () => {
      const db = createMockDb();
      await recordChanges(db, []);
      // No collections should be accessed
      expect(db.collection.callCount).to.equal(0);
    });
  });

  describe('getCurrentSeq', () => {
    it('should return current seq value', async () => {
      const db = createMockDb();
      const countersCol = { findOne: sinon.stub().resolves({ _id: '_seq_counter', value: 42 }) };
      db.collection.withArgs('_counters').returns(countersCol);

      const seq = await getCurrentSeq(db);
      expect(seq).to.equal(42);
    });

    it('should return 0 when no counter exists', async () => {
      const db = createMockDb();
      const countersCol = { findOne: sinon.stub().resolves(null) };
      db.collection.withArgs('_counters').returns(countersCol);

      const seq = await getCurrentSeq(db);
      expect(seq).to.equal(0);
    });
  });

  describe('createChangesFeed - one-shot mode', () => {
    it('should query changelog and emit complete', (done) => {
      const db = createMockDb();
      const cursor = { sort: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([
        { _seq: 1, id: 'doc1', rev: '1-a', deleted: false },
        { _seq: 2, id: 'doc2', rev: '1-b', deleted: false },
      ]) };
      const changelogCol = { find: sinon.stub().returns(cursor) };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      const docsCol = createMockDocsCollection();
      const emitter = createChangesFeed(db, docsCol, { since: 0 });

      emitter.on('complete', (result) => {
        expect(result.results).to.have.length(2);
        expect(result.results[0].id).to.equal('doc1');
        expect(result.results[0].seq).to.equal('1');
        expect(result.results[1].id).to.equal('doc2');
        expect(result.last_seq).to.equal('2');
        done();
      });
    });

    it('should respect limit option', (done) => {
      const db = createMockDb();
      const cursor = { sort: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([
        { _seq: 5, id: 'doc5', rev: '1-e', deleted: false },
      ]) };
      const changelogCol = { find: sinon.stub().returns(cursor) };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      const docsCol = createMockDocsCollection();
      const emitter = createChangesFeed(db, docsCol, { since: 4, limit: 1 });

      emitter.on('complete', (result) => {
        expect(cursor.limit.calledWith(1)).to.be.true;
        expect(result.results).to.have.length(1);
        done();
      });
    });

    it('should filter by doc_ids', (done) => {
      const db = createMockDb();
      const cursor = { sort: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([]) };
      const changelogCol = { find: sinon.stub().returns(cursor) };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      // For getCurrentSeq fallback
      const countersCol = { findOne: sinon.stub().resolves({ _id: '_seq_counter', value: 10 }) };
      db.collection.withArgs('_counters').returns(countersCol);

      const docsCol = createMockDocsCollection();
      const emitter = createChangesFeed(db, docsCol, { doc_ids: ['doc1', 'doc2'] });

      emitter.on('complete', (result) => {
        const query = changelogCol.find.args[0][0];
        expect(query.id.$in).to.deep.equal(['doc1', 'doc2']);
        expect(result.last_seq).to.equal('10');
        done();
      });
    });

    it('should emit error on query failure', (done) => {
      const db = createMockDb();
      const cursor = { sort: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().rejects(new Error('query failed')) };
      const changelogCol = { find: sinon.stub().returns(cursor) };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      const docsCol = createMockDocsCollection();
      const emitter = createChangesFeed(db, docsCol, {});

      emitter.on('error', (err) => {
        expect(err.message).to.equal('query failed');
        done();
      });
    });
  });

  describe('createChangesFeed - live mode', () => {
    it('should return an emitter with cancel', () => {
      const db = createMockDb();
      const countersCol = { findOne: sinon.stub().resolves({ value: 0 }) };
      db.collection.withArgs('_counters').returns(countersCol);

      const docsCol = createMockDocsCollection();
      const emitter = createChangesFeed(db, docsCol, { live: true, since: 'now' });
      expect(emitter.cancel).to.be.a('function');

      emitter.cancel();
    });

    it('should emit changes found by polling', (done) => {
      const db = createMockDb();
      const countersCol = { findOne: sinon.stub().resolves({ value: 0 }) };
      db.collection.withArgs('_counters').returns(countersCol);

      let pollCount = 0;
      const cursor = { sort: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub() };
      // First poll returns one change, subsequent polls return empty
      cursor.toArray.callsFake(() => {
        pollCount++;
        if (pollCount === 1) {
          return Promise.resolve([{ _seq: 1, id: 'doc1', rev: '1-a', deleted: false }]);
        }
        return Promise.resolve([]);
      });
      const changelogCol = { find: sinon.stub().returns(cursor) };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      const docsCol = createMockDocsCollection();
      const emitter = createChangesFeed(db, docsCol, { live: true, since: 0 });

      emitter.on('change', (change) => {
        expect(change.id).to.equal('doc1');
        expect(change.seq).to.equal('1');
        emitter.cancel();
        done();
      });
    });

    it('should emit error from poll failure', (done) => {
      const db = createMockDb();
      const cursor = { sort: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().rejects(new Error('poll failed')) };
      const changelogCol = { find: sinon.stub().returns(cursor) };
      db.collection.withArgs(CHANGELOG_COLLECTION).returns(changelogCol);

      const docsCol = createMockDocsCollection();
      const emitter = createChangesFeed(db, docsCol, { live: true, since: 0 });

      emitter.on('error', (err) => {
        expect(err.message).to.equal('poll failed');
        emitter.cancel();
        done();
      });
    });
  });
});
