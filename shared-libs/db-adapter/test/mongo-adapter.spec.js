const { expect } = require('chai');
const sinon = require('sinon');
const MongoAdapter = require('../src/mongo/mongo-adapter');

const createMockCollection = () => ({
  findOne: sinon.stub(),
  find: sinon.stub(),
  insertOne: sinon.stub(),
  findOneAndReplace: sinon.stub(),
  findOneAndUpdate: sinon.stub(),
  bulkWrite: sinon.stub(),
  countDocuments: sinon.stub(),
  drop: sinon.stub(),
  collectionName: 'docs',
});

const createMockDb = () => ({
  command: sinon.stub(),
});

const createAdapter = () => {
  const collection = createMockCollection();
  const db = createMockDb();
  const adapter = new MongoAdapter(collection, db, 'medic');
  return { adapter, collection, db };
};

describe('MongoAdapter', () => {
  afterEach(() => sinon.restore());

  it('should report backendType as mongodb', () => {
    const { adapter } = createAdapter();
    expect(adapter.backendType).to.equal('mongodb');
  });

  describe('get', () => {
    it('should return a document by id', async () => {
      const { adapter, collection } = createAdapter();
      const doc = { _id: 'doc1', _rev: '1-abc', type: 'report' };
      collection.findOne.resolves(doc);

      const result = await adapter.get('doc1');
      expect(result).to.deep.equal(doc);
      expect(collection.findOne.calledWith({ _id: 'doc1' })).to.be.true;
    });

    it('should throw 404 for missing doc', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOne.resolves(null);

      try {
        await adapter.get('missing');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(404);
      }
    });

    it('should throw 404 for deleted doc', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOne.resolves({ _id: 'doc1', _rev: '2-abc', _deleted: true });

      try {
        await adapter.get('doc1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(404);
      }
    });

    it('should strip attachment binary data by default', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOne.resolves({
        _id: 'doc1',
        _rev: '1-abc',
        _attachments: { 'file.xml': { data: Buffer.from('xml'), content_type: 'text/xml', length: 3 } },
      });

      const result = await adapter.get('doc1');
      expect(result._attachments['file.xml'].stub).to.be.true;
      expect(result._attachments['file.xml'].data).to.be.undefined;
    });
  });

  describe('put', () => {
    it('should insert a new doc (no _rev)', async () => {
      const { adapter, collection } = createAdapter();
      collection.insertOne.resolves();

      const result = await adapter.put({ _id: 'newdoc', type: 'report' });
      expect(result.ok).to.be.true;
      expect(result.id).to.equal('newdoc');
      expect(result.rev).to.match(/^1-/);
    });

    it('should update an existing doc (with _rev)', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOneAndReplace.resolves({ _id: 'doc1', _rev: '2-new', type: 'report' });

      const result = await adapter.put({ _id: 'doc1', _rev: '1-abc', type: 'report' });
      expect(result.ok).to.be.true;
      expect(result.id).to.equal('doc1');
      expect(result.rev).to.match(/^2-/);
    });

    it('should throw 409 on duplicate insert', async () => {
      const { adapter, collection } = createAdapter();
      const dupError = new Error('duplicate key');
      dupError.code = 11000;
      collection.insertOne.rejects(dupError);

      try {
        await adapter.put({ _id: 'existing', type: 'report' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(409);
      }
    });

    it('should throw 409 on rev mismatch during update', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOneAndReplace.resolves(null);
      collection.findOne.resolves({ _id: 'doc1', _rev: '2-other' });

      try {
        await adapter.put({ _id: 'doc1', _rev: '1-stale', type: 'report' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(409);
      }
    });

    it('should throw 404 if doc does not exist during update', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOneAndReplace.resolves(null);
      collection.findOne.resolves(null);

      try {
        await adapter.put({ _id: 'gone', _rev: '1-abc', type: 'report' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(404);
      }
    });
  });

  describe('post', () => {
    it('should generate _id if missing', async () => {
      const { adapter, collection } = createAdapter();
      collection.insertOne.resolves();

      const result = await adapter.post({ type: 'report' });
      expect(result.ok).to.be.true;
      expect(result.id).to.be.a('string');
      expect(result.rev).to.match(/^1-/);
    });
  });

  describe('remove', () => {
    it('should mark doc as deleted', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOneAndUpdate.resolves({ _id: 'doc1', _rev: '2-new', _deleted: true });

      const result = await adapter.remove({ _id: 'doc1', _rev: '1-abc' });
      expect(result.ok).to.be.true;
      expect(result.rev).to.match(/^2-/);
    });

    it('should throw 409 on rev mismatch', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOneAndUpdate.resolves(null);

      try {
        await adapter.remove({ _id: 'doc1', _rev: 'wrong' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(409);
      }
    });

    it('should accept (id, rev) signature', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOneAndUpdate.resolves({ _id: 'doc1', _deleted: true });

      const result = await adapter.remove('doc1', '1-abc');
      expect(result.ok).to.be.true;
    });
  });

  describe('allDocs', () => {
    it('should return all non-deleted docs', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([
        { _id: 'a', _rev: '1-a' },
        { _id: 'b', _rev: '1-b' },
      ]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(2);

      const result = await adapter.allDocs();
      expect(result.total_rows).to.equal(2);
      expect(result.rows).to.have.length(2);
      expect(result.rows[0]).to.deep.equal({ id: 'a', key: 'a', value: { rev: '1-a' } });
    });

    it('should filter by keys', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([
        { _id: 'a', _rev: '1-a' },
      ]) };
      collection.find.returns(cursor);

      const result = await adapter.allDocs({ keys: ['a', 'missing'] });
      expect(result.rows).to.have.length(2);
      expect(result.rows[0]).to.deep.equal({ id: 'a', key: 'a', value: { rev: '1-a' } });
      expect(result.rows[1]).to.deep.equal({ key: 'missing', error: 'not_found' });
    });

    it('should include docs when requested', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([
        { _id: 'a', _rev: '1-a', type: 'report' },
      ]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(1);

      const result = await adapter.allDocs({ include_docs: true });
      expect(result.rows[0].doc).to.deep.equal({ _id: 'a', _rev: '1-a', type: 'report' });
    });

    it('should handle startkey and endkey', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(0);

      await adapter.allDocs({ startkey: 'a', endkey: 'z' });
      const query = collection.find.args[0][0];
      expect(query._id.$gte).to.equal('a');
      expect(query._id.$lte).to.equal('z');
    });

    it('should handle descending order', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(0);

      await adapter.allDocs({ descending: true, startkey: 'z', endkey: 'a' });
      expect(cursor.sort.calledWith({ _id: -1 })).to.be.true;
      const query = collection.find.args[0][0];
      expect(query._id.$lte).to.equal('z');
      expect(query._id.$gte).to.equal('a');
    });

    it('should handle endkey with inclusive_end false', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(0);

      await adapter.allDocs({ startkey: 'a', endkey: 'z', inclusive_end: false });
      const query = collection.find.args[0][0];
      expect(query._id.$lt).to.equal('z');
    });

    it('should handle key option', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([
        { _id: 'specific', _rev: '1-a' },
      ]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(1);

      await adapter.allDocs({ key: 'specific' });
      const query = collection.find.args[0][0];
      expect(query._id).to.equal('specific');
    });

    it('should handle skip and limit', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(0);

      await adapter.allDocs({ skip: 10, limit: 5 });
      expect(cursor.skip.calledWith(10)).to.be.true;
      expect(cursor.limit.calledWith(5)).to.be.true;
    });

    it('should return deleted status for deleted docs in keys query', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([
        { _id: 'del', _rev: '2-x', _deleted: true },
      ]) };
      collection.find.returns(cursor);

      const result = await adapter.allDocs({ keys: ['del'] });
      expect(result.rows[0]).to.deep.equal({ id: 'del', key: 'del', value: { rev: '2-x', deleted: true } });
    });

    it('should include docs for deleted docs in keys query with include_docs', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([
        { _id: 'a', _rev: '1-a' },
      ]) };
      collection.find.returns(cursor);

      const result = await adapter.allDocs({ keys: ['a'], include_docs: true });
      expect(result.rows[0].doc).to.deep.equal({ _id: 'a', _rev: '1-a' });
    });
  });

  describe('bulkDocs', () => {
    it('should insert and update docs', async () => {
      const { adapter, collection } = createAdapter();
      collection.insertOne.resolves();
      collection.findOneAndReplace.resolves({ _id: 'existing', _rev: '2-x' });

      const results = await adapter.bulkDocs([
        { _id: 'new1', type: 'report' },
        { _id: 'existing', _rev: '1-old', type: 'contact' },
      ]);

      expect(results).to.have.length(2);
      expect(results[0].ok).to.be.true;
      expect(results[0].rev).to.match(/^1-/);
      expect(results[1].ok).to.be.true;
      expect(results[1].rev).to.match(/^2-/);
    });

    it('should handle errors per doc', async () => {
      const { adapter, collection } = createAdapter();
      const dupError = new Error('dup');
      dupError.code = 11000;
      collection.insertOne.rejects(dupError);

      const results = await adapter.bulkDocs([{ _id: 'dup', type: 'x' }]);
      expect(results[0].error).to.equal('conflict');
    });

    it('should upsert with new_edits: false', async () => {
      const { adapter, collection } = createAdapter();
      collection.bulkWrite.resolves({ ok: 1 });

      const results = await adapter.bulkDocs(
        [{ _id: 'doc1', _rev: '3-abc', type: 'report' }],
        { new_edits: false }
      );

      expect(collection.bulkWrite.calledOnce).to.be.true;
      const ops = collection.bulkWrite.args[0][0];
      expect(ops[0].replaceOne.filter).to.deep.equal({ _id: 'doc1' });
      expect(ops[0].replaceOne.upsert).to.be.true;
      expect(results).to.deep.equal([]);
    });
  });

  describe('bulkGet', () => {
    it('should return docs by id', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { toArray: sinon.stub().resolves([{ _id: 'a', _rev: '1-a', type: 'report' }]) };
      collection.find.returns(cursor);

      const result = await adapter.bulkGet({ docs: [{ id: 'a' }, { id: 'missing' }] });
      expect(result.results).to.have.length(2);
      expect(result.results[0].docs[0].ok._id).to.equal('a');
      expect(result.results[1].docs[0].error.error).to.equal('not_found');
    });
  });

  describe('info', () => {
    it('should return database info', async () => {
      const { adapter, db } = createAdapter();
      db.command.resolves({ count: 42 });

      const result = await adapter.info();
      expect(result.db_name).to.equal('medic');
      expect(result.doc_count).to.equal(42);
      expect(result.update_seq).to.equal(42);
    });
  });

  describe('attachments', () => {
    it('should get attachment data', async () => {
      const { adapter, collection } = createAdapter();
      const data = Buffer.from('hello');
      collection.findOne.resolves({
        _id: 'doc1',
        _attachments: { 'file.txt': { data, content_type: 'text/plain', length: 5 } },
      });

      const result = await adapter.getAttachment('doc1', 'file.txt');
      expect(result).to.deep.equal(data);
    });

    it('should throw 404 for missing attachment', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOne.resolves({ _id: 'doc1', _attachments: {} });

      try {
        await adapter.getAttachment('doc1', 'nope');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(404);
      }
    });

    it('should put attachment with rev check', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOneAndUpdate.resolves({ _id: 'doc1', _rev: '2-new' });

      const result = await adapter.putAttachment('doc1', 'file.txt', '1-abc', Buffer.from('hi'), 'text/plain');
      expect(result.ok).to.be.true;
      expect(result.rev).to.match(/^2-/);
    });
  });

  describe('changes', () => {
    it('should return an emitter with cancel', () => {
      const { adapter } = createAdapter();
      const emitter = adapter.changes();
      expect(emitter.cancel).to.be.a('function');
    });

    it('should emit complete for non-live changes', (done) => {
      const { adapter } = createAdapter();
      const emitter = adapter.changes({ live: false });
      emitter.on('complete', (info) => {
        expect(info.results).to.deep.equal([]);
        done();
      });
    });
  });

  describe('query', () => {
    it('should throw not implemented error', async () => {
      const { adapter } = createAdapter();
      try {
        await adapter.query('medic/contacts_by_depth');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.include('not yet implemented');
      }
    });
  });

  describe('remove edge cases', () => {
    it('should throw 409 when no rev provided', async () => {
      const { adapter } = createAdapter();
      try {
        await adapter.remove('doc1');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(409);
      }
    });
  });

  describe('get edge cases', () => {
    it('should throw 404 when no id provided', async () => {
      const { adapter } = createAdapter();
      try {
        await adapter.get(null);
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(404);
      }
    });
  });

  describe('bulkDocs edge cases', () => {
    it('should return empty array for empty docs', async () => {
      const { adapter } = createAdapter();
      const results = await adapter.bulkDocs([]);
      expect(results).to.deep.equal([]);
    });

    it('should handle write errors with new_edits false', async () => {
      const { adapter, collection } = createAdapter();
      const bulkErr = new Error('bulk error');
      bulkErr.writeErrors = [{ index: 0, errmsg: 'write failed' }];
      collection.bulkWrite.rejects(bulkErr);

      const results = await adapter.bulkDocs([{ _id: 'bad' }], { new_edits: false });
      expect(results).to.have.length(1);
      expect(results[0].error).to.equal('error');
    });

    it('should rethrow non-write errors with new_edits false', async () => {
      const { adapter, collection } = createAdapter();
      collection.bulkWrite.rejects(new Error('network error'));

      try {
        await adapter.bulkDocs([{ _id: 'x' }], { new_edits: false });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('network error');
      }
    });
  });

  describe('close', () => {
    it('should resolve without error', async () => {
      const { adapter } = createAdapter();
      await adapter.close();
    });
  });

  describe('viewCleanup', () => {
    it('should resolve without error (no-op)', async () => {
      const { adapter } = createAdapter();
      await adapter.viewCleanup();
    });
  });

  describe('compact', () => {
    it('should call compact command', async () => {
      const { adapter, db } = createAdapter();
      db.command.resolves();
      await adapter.compact();
      expect(db.command.calledWith({ compact: 'docs' })).to.be.true;
    });
  });

  describe('destroy', () => {
    it('should drop the collection', async () => {
      const { adapter, collection } = createAdapter();
      collection.drop.resolves();
      await adapter.destroy();
      expect(collection.drop.calledOnce).to.be.true;
    });
  });

  describe('put edge cases', () => {
    it('should throw when _id is missing', async () => {
      const { adapter } = createAdapter();
      try {
        await adapter.put({ type: 'report' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('Missing _id');
      }
    });

    it('should propagate non-duplicate insert errors', async () => {
      const { adapter, collection } = createAdapter();
      collection.insertOne.rejects(new Error('network error'));

      try {
        await adapter.put({ _id: 'doc1', type: 'report' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('network error');
      }
    });
  });

  describe('post edge cases', () => {
    it('should propagate non-duplicate insert errors', async () => {
      const { adapter, collection } = createAdapter();
      collection.insertOne.rejects(new Error('timeout'));

      try {
        await adapter.post({ _id: 'doc1', type: 'report' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.message).to.equal('timeout');
      }
    });

    it('should throw 409 on duplicate key', async () => {
      const { adapter, collection } = createAdapter();
      const dupError = new Error('dup');
      dupError.code = 11000;
      collection.insertOne.rejects(dupError);

      try {
        await adapter.post({ _id: 'dup' });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(409);
      }
    });
  });

  describe('putAttachment edge cases', () => {
    it('should throw 409 on rev mismatch', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOneAndUpdate.resolves(null);

      try {
        await adapter.putAttachment('doc1', 'file.txt', 'wrong-rev', Buffer.from('hi'), 'text/plain');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(409);
      }
    });
  });

  describe('_formatDoc edge cases', () => {
    it('should handle null doc in bulkGet', async () => {
      const { adapter, collection } = createAdapter();
      // Force _formatDoc to receive null via bulkGet with a doc that exists
      const cursor = { toArray: sinon.stub().resolves([]) };
      collection.find.returns(cursor);

      const result = await adapter.bulkGet({ docs: [{ id: 'missing' }] });
      expect(result.results[0].docs[0].error.error).to.equal('not_found');
    });

    it('should include attachment data when attachments option is true', async () => {
      const { adapter, collection } = createAdapter();
      const data = Buffer.from('content');
      collection.findOne.resolves({
        _id: 'doc1',
        _rev: '1-abc',
        _attachments: { 'file.txt': { data, content_type: 'text/plain', length: 7 } },
      });

      const result = await adapter.get('doc1', { attachments: true });
      expect(result._attachments['file.txt'].data).to.deep.equal(data);
      expect(result._attachments['file.txt'].stub).to.be.undefined;
    });
  });

  describe('allDocs descending with inclusive_end false', () => {
    it('should use $gt for descending with inclusive_end false', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(0);

      await adapter.allDocs({ descending: true, startkey: 'z', endkey: 'a', inclusive_end: false });
      const query = collection.find.args[0][0];
      expect(query._id.$gt).to.equal('a');
    });
  });

  describe('allDocs with only startkey', () => {
    it('should handle startkey without endkey', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(0);

      await adapter.allDocs({ startkey: 'abc' });
      const query = collection.find.args[0][0];
      expect(query._id.$gte).to.equal('abc');
      expect(query._id.$lte).to.be.undefined;
    });
  });

  describe('allDocs with only endkey', () => {
    it('should handle endkey without startkey', async () => {
      const { adapter, collection } = createAdapter();
      const cursor = { sort: sinon.stub().returnsThis(), skip: sinon.stub().returnsThis(), limit: sinon.stub().returnsThis(), toArray: sinon.stub().resolves([]) };
      collection.find.returns(cursor);
      collection.countDocuments.resolves(0);

      await adapter.allDocs({ endkey: 'xyz' });
      const query = collection.find.args[0][0];
      expect(query._id.$lte).to.equal('xyz');
    });
  });

  describe('bulkDocs with null input', () => {
    it('should return empty array for null docs', async () => {
      const { adapter } = createAdapter();
      const results = await adapter.bulkDocs(null);
      expect(results).to.deep.equal([]);
    });
  });

  describe('get with revs option on deleted doc', () => {
    it('should return deleted doc when rev option is set', async () => {
      const { adapter, collection } = createAdapter();
      collection.findOne.resolves({ _id: 'doc1', _rev: '2-abc', _deleted: true });

      const result = await adapter.get('doc1', { rev: '2-abc' });
      expect(result._id).to.equal('doc1');
      expect(result._deleted).to.be.true;
    });
  });
});
