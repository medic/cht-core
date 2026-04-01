const { expect } = require('chai');
const sinon = require('sinon');
const { createAdapter, wrapCouch, wrapMongo, initMongo, CouchAdapter, MongoAdapter, BACKENDS } = require('../src/index');

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
});

const createMockMongoClient = () => ({
  db: sinon.stub().returns({
    collection: sinon.stub().returns({
      findOne: sinon.stub(),
      find: sinon.stub(),
      insertOne: sinon.stub(),
    }),
    command: sinon.stub(),
  }),
});

describe('db-adapter index', () => {
  let originalBackend;

  beforeEach(() => {
    originalBackend = process.env.DB_BACKEND;
  });

  afterEach(() => {
    sinon.restore();
    if (originalBackend === undefined) {
      delete process.env.DB_BACKEND;
    } else {
      process.env.DB_BACKEND = originalBackend;
    }
  });

  describe('BACKENDS', () => {
    it('should define couchdb backend', () => {
      expect(BACKENDS.couchdb).to.equal('couchdb');
    });

    it('should define mongodb backend', () => {
      expect(BACKENDS.mongodb).to.equal('mongodb');
    });
  });

  describe('wrapCouch', () => {
    it('should wrap a PouchDB instance in a CouchAdapter', () => {
      const pouchDb = createMockPouchDb();
      const adapter = wrapCouch(pouchDb);
      expect(adapter).to.be.instanceOf(CouchAdapter);
      expect(adapter.backendType).to.equal('couchdb');
    });
  });

  describe('wrapMongo', () => {
    it('should create a MongoAdapter', () => {
      initMongo(createMockMongoClient());
      const adapter = wrapMongo('medic');
      expect(adapter).to.be.instanceOf(MongoAdapter);
      expect(adapter.backendType).to.equal('mongodb');
    });

    it('should throw if mongo client not initialized', () => {
      initMongo(null);
      expect(() => wrapMongo('medic')).to.throw('MongoDB client not initialized');
    });
  });

  describe('createAdapter', () => {
    it('should create a CouchAdapter when DB_BACKEND is not set', () => {
      delete process.env.DB_BACKEND;
      const pouchDb = createMockPouchDb();
      const adapter = createAdapter(pouchDb);
      expect(adapter.backendType).to.equal('couchdb');
    });

    it('should create a CouchAdapter when DB_BACKEND is couchdb', () => {
      process.env.DB_BACKEND = 'couchdb';
      const pouchDb = createMockPouchDb();
      const adapter = createAdapter(pouchDb);
      expect(adapter.backendType).to.equal('couchdb');
    });

    it('should create a MongoAdapter when DB_BACKEND is mongodb', () => {
      process.env.DB_BACKEND = 'mongodb';
      initMongo(createMockMongoClient());
      const adapter = createAdapter('medic');
      expect(adapter.backendType).to.equal('mongodb');
    });

    it('should throw for unsupported backend', () => {
      process.env.DB_BACKEND = 'unsupported';
      const pouchDb = createMockPouchDb();
      expect(() => createAdapter(pouchDb)).to.throw('Unsupported database backend: unsupported');
    });
  });
});
