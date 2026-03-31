const { expect } = require('chai');
const sinon = require('sinon');
const CouchAdapter = require('../src/couch/couch-adapter');

const createMockPouchDb = () => ({
  get: sinon.stub(),
  put: sinon.stub(),
  post: sinon.stub(),
  remove: sinon.stub(),
  allDocs: sinon.stub(),
  bulkDocs: sinon.stub(),
  bulkGet: sinon.stub(),
  query: sinon.stub(),
  changes: sinon.stub(),
  getAttachment: sinon.stub(),
  putAttachment: sinon.stub(),
  info: sinon.stub(),
  close: sinon.stub(),
  compact: sinon.stub(),
  viewCleanup: sinon.stub(),
  destroy: sinon.stub(),
  setMaxListeners: sinon.stub(),
  _destroyed: false,
  _closed: false,
  name: 'test-db',
});

describe('CouchAdapter', () => {
  let pouchDb;
  let adapter;

  beforeEach(() => {
    pouchDb = createMockPouchDb();
    adapter = new CouchAdapter(pouchDb);
  });

  afterEach(() => sinon.restore());

  it('should report backendType as couchdb', () => {
    expect(adapter.backendType).to.equal('couchdb');
  });

  describe('document CRUD', () => {
    it('should delegate get()', async () => {
      const doc = { _id: 'doc1', _rev: '1-abc' };
      pouchDb.get.resolves(doc);
      const result = await adapter.get('doc1');
      expect(result).to.deep.equal(doc);
      expect(pouchDb.get.calledWith('doc1')).to.be.true;
    });

    it('should delegate get() with options', async () => {
      const doc = { _id: 'doc1', _rev: '1-abc' };
      pouchDb.get.resolves(doc);
      await adapter.get('doc1', { revs: true });
      expect(pouchDb.get.calledWith('doc1', { revs: true })).to.be.true;
    });

    it('should delegate put()', async () => {
      const response = { ok: true, id: 'doc1', rev: '2-def' };
      pouchDb.put.resolves(response);
      const result = await adapter.put({ _id: 'doc1', _rev: '1-abc', field: 'value' });
      expect(result).to.deep.equal(response);
      expect(pouchDb.put.calledOnce).to.be.true;
    });

    it('should delegate post()', async () => {
      const response = { ok: true, id: 'new-id', rev: '1-abc' };
      pouchDb.post.resolves(response);
      const result = await adapter.post({ field: 'value' });
      expect(result).to.deep.equal(response);
    });

    it('should delegate remove()', async () => {
      const response = { ok: true, id: 'doc1', rev: '3-ghi' };
      pouchDb.remove.resolves(response);
      const result = await adapter.remove({ _id: 'doc1', _rev: '2-def' });
      expect(result).to.deep.equal(response);
    });
  });

  describe('bulk operations', () => {
    it('should delegate allDocs()', async () => {
      const response = { total_rows: 1, offset: 0, rows: [{ id: 'doc1', key: 'doc1', value: { rev: '1-abc' } }] };
      pouchDb.allDocs.resolves(response);
      const result = await adapter.allDocs({ include_docs: true });
      expect(result).to.deep.equal(response);
      expect(pouchDb.allDocs.calledWith({ include_docs: true })).to.be.true;
    });

    it('should delegate bulkDocs()', async () => {
      const docs = [{ _id: 'a' }, { _id: 'b' }];
      const response = [{ ok: true, id: 'a', rev: '1-x' }, { ok: true, id: 'b', rev: '1-y' }];
      pouchDb.bulkDocs.resolves(response);
      const result = await adapter.bulkDocs(docs, { new_edits: false });
      expect(result).to.deep.equal(response);
      expect(pouchDb.bulkDocs.calledWith(docs, { new_edits: false })).to.be.true;
    });

    it('should delegate bulkGet()', async () => {
      const opts = { docs: [{ id: 'a' }], attachments: true, revs: true };
      const response = { results: [{ id: 'a', docs: [{ ok: { _id: 'a' } }] }] };
      pouchDb.bulkGet.resolves(response);
      const result = await adapter.bulkGet(opts);
      expect(result).to.deep.equal(response);
    });
  });

  describe('query', () => {
    it('should delegate query()', async () => {
      const response = { total_rows: 1, offset: 0, rows: [{ id: 'doc1', key: 'type', value: null }] };
      pouchDb.query.resolves(response);
      const result = await adapter.query('medic-client/contacts_by_type', { keys: ['person'] });
      expect(result).to.deep.equal(response);
      expect(pouchDb.query.calledWith('medic-client/contacts_by_type', { keys: ['person'] })).to.be.true;
    });
  });

  describe('changes', () => {
    it('should delegate changes()', () => {
      const changesObj = { on: sinon.stub(), cancel: sinon.stub() };
      pouchDb.changes.returns(changesObj);
      const result = adapter.changes({ live: true, since: 'now' });
      expect(result).to.equal(changesObj);
      expect(pouchDb.changes.calledWith({ live: true, since: 'now' })).to.be.true;
    });
  });

  describe('attachments', () => {
    it('should delegate getAttachment()', async () => {
      const blob = Buffer.from('data');
      pouchDb.getAttachment.resolves(blob);
      const result = await adapter.getAttachment('doc1', 'file.txt');
      expect(result).to.equal(blob);
    });

    it('should delegate putAttachment()', async () => {
      const response = { ok: true, id: 'doc1', rev: '2-abc' };
      pouchDb.putAttachment.resolves(response);
      const data = Buffer.from('data');
      const result = await adapter.putAttachment('doc1', 'file.txt', '1-abc', data, 'text/plain');
      expect(result).to.deep.equal(response);
    });
  });

  describe('database operations', () => {
    it('should delegate info()', async () => {
      const dbInfo = { db_name: 'medic', update_seq: '123-abc', doc_count: 500 };
      pouchDb.info.resolves(dbInfo);
      const result = await adapter.info();
      expect(result).to.deep.equal(dbInfo);
    });

    it('should delegate close()', () => {
      adapter.close();
      expect(pouchDb.close.calledOnce).to.be.true;
    });

    it('should delegate compact()', () => {
      adapter.compact();
      expect(pouchDb.compact.calledOnce).to.be.true;
    });

    it('should delegate viewCleanup()', () => {
      adapter.viewCleanup();
      expect(pouchDb.viewCleanup.calledOnce).to.be.true;
    });

    it('should delegate destroy()', () => {
      adapter.destroy();
      expect(pouchDb.destroy.calledOnce).to.be.true;
    });
  });

  describe('proxy for PouchDB-specific properties', () => {
    it('should forward _destroyed property', () => {
      expect(adapter._destroyed).to.be.false;
      pouchDb._destroyed = true;
      expect(adapter._destroyed).to.be.true;
    });

    it('should forward _closed property', () => {
      expect(adapter._closed).to.be.false;
      pouchDb._closed = true;
      expect(adapter._closed).to.be.true;
    });

    it('should forward name property', () => {
      expect(adapter.name).to.equal('test-db');
    });

    it('should forward setMaxListeners()', () => {
      adapter.setMaxListeners(0);
      expect(pouchDb.setMaxListeners.calledWith(0)).to.be.true;
    });

    it('should forward property writes to PouchDB', () => {
      adapter.customProp = 'test';
      expect(pouchDb.customProp).to.equal('test');
    });

    it('should allow writing to adapter-owned properties', () => {
      adapter._db = pouchDb;
      expect(adapter._db).to.equal(pouchDb);
    });
  });
});
