const sinon = require('sinon');
require('chai').use(require('chai-as-promised'));
const rewire = require('rewire');
const { expect } = require('chai');
const initialReplication = rewire('../../../src/js/bootstrapper/initial-replication');
const utils = require('../../../src/js/bootstrapper/utils');

let localDb;
let remoteDb;
let userCtx;
let clock;
let onPromise;

const FLAG_ID = '_local/initial-replication';

describe('Initial replication', () => {

  global.window = {};

  afterEach(() => {
    sinon.restore();
    clock && clock.restore();
    delete window.medicmobile_android;
  });
  describe('isReplicationNeeded', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('should return true if missing ddoc', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client', error: 'missing' },
            { id: 'settings' },
            { id: 'org.couchdb.user:Nivea' },
          ]
        }),
      };
      userCtx = { name: 'Nivea' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);

      expect(localDb.allDocs.args).to.deep.equal([[
        { keys: ['_design/medic-client', 'settings', 'org.couchdb.user:Nivea'] },
      ]]);
    });

    it('should return false if missing settings', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings', error: 'missing' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().resolves({ complete: true }),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);
    });

    it('should return true if missing user settings', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx', error: 'missing' },
          ]
        }),
        get: sinon.stub().resolves({ complete: true }),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);
    });

    // old user that offline, and reloads the app
    it('should return false if missing replication log', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().rejects({ status: 404 }),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(false);
    });

    it('should return true if replication log is not complete', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().resolves({ }),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(true);
    });

    it('should return false if all conditions are met', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().resolves({ complete: true }),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(false);
    });

    it('should throw allDocs errors', async () => {
      localDb = {
        allDocs: sinon.stub().rejects(new Error('boom')),
        get: sinon.stub().resolves({}),
      };
      userCtx = { name: 'Skagen' };

      await expect(initialReplication.isReplicationNeeded(localDb, userCtx)).to.be.rejectedWith(Error, 'boom');
    });

    it('should not throw local doc get errors', async () => {
      localDb = {
        allDocs: sinon.stub().resolves({
          rows: [
            { id: '_design/medic-client' },
            { id: 'settings' },
            { id: 'userctx' },
          ]
        }),
        get: sinon.stub().rejects(new Error('and its gone')),
      };
      userCtx = { name: 'Skagen' };

      expect(await initialReplication.isReplicationNeeded(localDb, userCtx)).to.equal(false);
    });
  });

  describe('replicate', () => {
    beforeEach(() => {
      localDb = {
        allDocs: sinon.stub(),
        bulkDocs: sinon.stub(),
        get: sinon.stub(),
        put: sinon.stub(),
        replicate: {
          from: sinon.stub(),
          to: sinon.stub(),
        },
        info: sinon.stub(),
      };
      remoteDb = {
        bulkGet: sinon.stub(),
      };
      clock = sinon.useFakeTimers();
      onPromise = Promise.resolve();
      onPromise.on = sinon.stub();
      onPromise.cancel = sinon.stub();
    });

    it('should perform initial replication', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
          { id: 'three', rev: 2 },
          { id: 'four', rev: 3 },
          { id: 'five', rev: 1 },
        ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });

      remoteDb.bulkGet.resolves({
        results: [
          { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], },
          { id: 'two', docs: [{ ok: { _id: 'two', _rev: 1, field: 'two' } }], },
          { id: 'three', docs: [{ ok: { _id: 'three', _rev: 1, field: 'three' } }], },
          { id: 'four', docs: [{ ok: { _id: 'four', _rev: 1, field: 'four' } }], },
          { id: 'five', docs: [{ ok: { _id: 'five', _rev: 1, field: 'five' } }], },
        ]
      });

      localDb.bulkDocs.resolves();
      localDb.get.onCall(0).rejects({ status: 404 }).resolves({ _id: FLAG_ID, start_time: 0 });
      localDb.put.resolves();

      localDb.replicate.from.returns(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 5 });

      await initialReplication.replicate(remoteDb, localDb);

      expect(utils.fetchJSON.args).to.deep.equal([['/api/v1/initial-replication/get-ids']]);
      expect(localDb.allDocs.args).to.deep.equal([[]]);

      expect(remoteDb.bulkGet.args).to.deep.equal([[{
        docs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
          { id: 'three', rev: 2 },
          { id: 'four', rev: 3 },
          { id: 'five', rev: 1 },
        ],
        attachments: true,
      }]]);
      expect(localDb.bulkDocs.args).to.deep.equal([[
        [
          { _id: 'one', _rev: 1, field: 'one' },
          { _id: 'two', _rev: 1, field: 'two' },
          { _id: 'three', _rev: 1, field: 'three' },
          { _id: 'four', _rev: 1, field: 'four' },
          { _id: 'five', _rev: 1, field: 'five' },
        ],
        { new_edits: false },
      ]]);

      expect(localDb.put.args).to.deep.equal([
        [{
          _id: FLAG_ID,
          start_data_usage: undefined,
          start_time: 0,
        }],
        [{
          _id: FLAG_ID,
          complete: true,
          data_usage: undefined,
          duration: 0,
          start_time: 0,
        }]
      ]);

      expect(localDb.replicate.from.args).to.deep.equal([[
        remoteDb,
        {
          live: false,
          retry: false,
          heartbeat: 10000,
          timeout: 1000 * 60 * 10, // try for ten minutes then give up,
          query_params: { initial_replication: true },
          since: '123-fdhsfs',
        }
      ]]);

      expect(localDb.replicate.to.args).to.deep.equal([[
        remoteDb,
        { since: 5 },
      ]]);
    });

    it('should save duration and data usage in log file', async () => {
      clock.tick(1000);

      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
        ],
        warn_docs: 2,
        last_seq: '456-111',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });

      remoteDb.bulkGet.resolves({
        results: [
          { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], },
          { id: 'two', docs: [{ ok: { _id: 'two', _rev: 1, field: 'two' } }], },
        ]
      });

      localDb.bulkDocs.callsFake(() => {
        clock.tick(5000);
        return Promise.resolve();
      });
      localDb.get
        .onCall(0).rejects({ status: 404 })
        .resolves({ _id: FLAG_ID, start_time: 1000, start_data_usage: { app: { rx: 100 } } });
      localDb.put.resolves();

      localDb.replicate.from.returns(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 2 });
      window.medicmobile_android = { getDataUsage: sinon.stub() };
      window.medicmobile_android.getDataUsage
        .onCall(0).returns(JSON.stringify({ app: { rx: 100 } }))
        .onCall(1).returns(JSON.stringify({ app: { rx: 300 } }));

      await initialReplication.replicate(remoteDb, localDb);

      expect(utils.fetchJSON.args).to.deep.equal([['/api/v1/initial-replication/get-ids']]);
      expect(localDb.allDocs.args).to.deep.equal([[]]);

      expect(remoteDb.bulkGet.args).to.deep.equal([[{
        docs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
        ],
        attachments: true,
      }]]);
      expect(localDb.bulkDocs.args).to.deep.equal([[
        [
          { _id: 'one', _rev: 1, field: 'one' },
          { _id: 'two', _rev: 1, field: 'two' },
        ],
        { new_edits: false },
      ]]);

      expect(localDb.put.args).to.deep.equal([
        [{
          _id: FLAG_ID,
          start_time: 1000,
          start_data_usage: { app: { rx: 100 } },
        }],
        [{
          _id: FLAG_ID,
          complete: true,
          data_usage: 200,
          duration: 5000,
          start_time: 1000,
          start_data_usage: { app: { rx: 100 } },
        }]
      ]);

      expect(localDb.replicate.from.args).to.deep.equal([[
        remoteDb,
        {
          live: false,
          retry: false,
          heartbeat: 10000,
          timeout: 1000 * 60 * 10, // try for ten minutes then give up,
          query_params: { initial_replication: true },
          since: '456-111',
        }
      ]]);

      expect(localDb.replicate.to.args).to.deep.equal([[
        remoteDb,
        { since: 2 },
      ]]);
    });

    it('should download and save docs in batches', async () => {
      const docIds =  Array.from({ length: 650 }).map((_, i) => String(i));
      const docIdsRevs = docIds.map((i) => ({ id: i, rev: 1 }));

      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: docIdsRevs,
        warn_docs: docIds.length,
        last_seq: '456-111',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });
      remoteDb.bulkGet.callsFake(({ docs }) => {
        const results = Object.values(docs).map(({ id, rev }) => ({
          id: id,
          docs: [{ ok: { _id: id, _rev: rev, value: id } }],
        }));
        return Promise.resolve({ results });
      });

      localDb.bulkDocs.resolves();
      localDb.get
        .onCall(0).rejects({ status: 404 })
        .resolves({ _id: FLAG_ID, start_time: 0 });
      localDb.put.resolves();

      localDb.replicate.from.returns(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 650 });

      await initialReplication.replicate(remoteDb, localDb);

      expect(utils.fetchJSON.args).to.deep.equal([['/api/v1/initial-replication/get-ids']]);
      expect(localDb.allDocs.args).to.deep.equal([[]]);

      expect(remoteDb.bulkGet.callCount).to.equal(7);
      const bulkGetArgs = [];
      remoteDb.bulkGet.args.forEach(([ { docs }], i) => {
        expect(docs.length).to.equal( i < 6 ? 100 : 50);
        bulkGetArgs.push(...docs.map(doc => doc.id));
      });
      expect(bulkGetArgs).to.deep.equal(docIds);

      expect(localDb.bulkDocs.callCount).to.equal(7);
      const bulkDocsArgs = [];
      localDb.bulkDocs.args.forEach(([docs], i) => {
        expect(docs.length).to.equal( i < 6 ? 100 : 50);
        bulkDocsArgs.push(...docs.map(doc => doc._id));
      });
      expect(bulkDocsArgs).to.deep.equal(docIds);

      expect(localDb.put.args).to.deep.equal([
        [{
          _id: FLAG_ID,
          start_time: 0,
          start_data_usage: undefined,
        }],
        [{
          _id: FLAG_ID,
          complete: true,
          data_usage: undefined,
          duration: 0,
          start_time: 0,
        }]
      ]);

      expect(localDb.replicate.from.args).to.deep.equal([[
        remoteDb,
        {
          live: false,
          retry: false,
          heartbeat: 10000,
          timeout: 1000 * 60 * 10, // try for ten minutes then give up,
          query_params: { initial_replication: true },
          since: '456-111',
        }
      ]]);

      expect(localDb.replicate.to.args).to.deep.equal([[
        remoteDb,
        { since: 650 },
      ]]);
    });

    it('should skip downloading docs that already exist locally', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
          { id: 'three', rev: 2 },
          { id: 'four', rev: 3 },
          { id: 'five', rev: 1 },
        ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({
        rows: [
          { id: 'three', value: { rev: 2 } },
          { id: 'four', value: { rev: 3 } },
        ]
      });

      remoteDb.bulkGet.resolves({
        results: [
          { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], },
          { id: 'two', docs: [{ ok: { _id: 'two', _rev: 1, field: 'two' } }], },
          { id: 'five', docs: [{ ok: { _id: 'five', _rev: 1, field: 'five' } }], },
        ]
      });

      localDb.bulkDocs.resolves();
      localDb.get
        .onCall(0).rejects({ status: 404 })
        .resolves({ _id: FLAG_ID, start_time: 0 });
      localDb.put.resolves();

      localDb.replicate.from.returns(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 5 });

      await initialReplication.replicate(remoteDb, localDb);

      expect(remoteDb.bulkGet.args).to.deep.equal([[{
        docs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
          { id: 'five', rev: 1 },
        ],
        attachments: true,
      }]]);
      expect(localDb.bulkDocs.args).to.deep.equal([[
        [
          { _id: 'one', _rev: 1, field: 'one' },
          { _id: 'two', _rev: 1, field: 'two' },
          { _id: 'five', _rev: 1, field: 'five' },
        ],
        { new_edits: false },
      ]]);
    });

    it('should skip _bulk_get entirely when all docs exist locally', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
          { id: 'three', rev: 2 },
          { id: 'four', rev: 3 },
          { id: 'five', rev: 1 },
        ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({
        rows: [
          { id: 'one', value: { rev: 1 } },
          { id: 'two', value: { rev: 1 } },
          { id: 'three', value: { rev: 2 } },
          { id: 'four', value: { rev: 3 } },
          { id: 'five', value: { rev: 1 } },
        ]
      });
      localDb.get
        .onCall(0).rejects({ status: 404 })
        .resolves({ _id: FLAG_ID, start_time: 0 });
      localDb.put.resolves();

      localDb.replicate.from.returns(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 5 });

      await initialReplication.replicate(remoteDb, localDb);

      expect(remoteDb.bulkGet.callCount).to.equal(0);
      expect(localDb.bulkDocs.callCount).to.equal(0);

      expect(localDb.put.args).to.deep.equal([
        [{
          _id: FLAG_ID,
          start_time: 0,
          start_data_usage: undefined,
        }],
        [{
          _id: FLAG_ID,
          complete: true,
          data_usage: undefined,
          duration: 0,
          start_time: 0,
        }]
      ]);

      expect(localDb.replicate.from.args).to.deep.equal([[
        remoteDb,
        {
          live: false,
          retry: false,
          heartbeat: 10000,
          timeout: 1000 * 60 * 10, // try for ten minutes then give up,
          query_params: { initial_replication: true },
          since: '123-fdhsfs',
        }
      ]]);
      expect(onPromise.on.callCount).to.equal(1);
      expect(onPromise.on.args[0][0]).to.equal('change');
      expect(onPromise.cancel.callCount).to.equal(0);
      onPromise.on.args[0][1]();
      expect(onPromise.cancel.callCount).to.equal(1);

      expect(localDb.replicate.to.args).to.deep.equal([[
        remoteDb,
        { since: 5 },
      ]]);
    });

    it('should work when _bulk_get skips docs or doesnt return docs', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
          { id: 'three', rev: 2 },
          { id: 'four', rev: 3 },
          { id: 'five', rev: 1 },
        ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });

      remoteDb.bulkGet.resolves({
        results: [
          { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], },
          { id: 'two', docs: [{ ok: { _id: 'two', _rev: 1, field: 'two' } }], },
          { id: 'three', docs: [{ ok: { _id: 'three', _rev: 1, field: 'three' } }], },
          { id: 'four', docs: [{ error: 'missing' }], },
        ]
      });

      localDb.bulkDocs.resolves();
      localDb.get
        .onCall(0).rejects({ status: 404 })
        .resolves({ _id: FLAG_ID, start_time: 0 });
      localDb.put.resolves();

      localDb.replicate.from.returns(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 5 });

      await initialReplication.replicate(remoteDb, localDb);

      expect(remoteDb.bulkGet.args).to.deep.equal([[{
        docs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
          { id: 'three', rev: 2 },
          { id: 'four', rev: 3 },
          { id: 'five', rev: 1 },
        ],
        attachments: true,
      }]]);
      expect(localDb.bulkDocs.args).to.deep.equal([[
        [
          { _id: 'one', _rev: 1, field: 'one' },
          { _id: 'two', _rev: 1, field: 'two' },
          { _id: 'three', _rev: 1, field: 'three' },
        ],
        { new_edits: false },
      ]]);
    });

    it('should overwrite initial replication log, if it already exists', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
        ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });
      remoteDb.bulkGet.resolves({
        results: [
          { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], },
          { id: 'two', docs: [{ ok: { _id: 'two', _rev: 1, field: 'two' } }], },
        ]
      });

      localDb.bulkDocs.resolves();
      localDb.get.resolves({ _id: FLAG_ID, start_time: 0 });
      localDb.put.resolves();

      localDb.replicate.from.resolves(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 5 });

      await initialReplication.replicate(remoteDb, localDb);

      expect(localDb.put.args).to.deep.equal([[{
        _id: FLAG_ID,
        complete: true,
        data_usage: undefined,
        duration: 0,
        start_time: 0,
      }]]);
    });

    it('should display warning if there are too many docs', async () => {
      const pollResponse = {
        doc_ids_revs: [
          { id: 'one', rev: 1 },
          { id: 'two', rev: 1 },
          { id: 'three', rev: 2 },
          { id: 'four', rev: 3 },
          { id: 'five', rev: 1 },
        ],
        warn_docs: 15000,
        last_seq: '456-fdhsfs',
        warn: true,
        limit: 10000
      };
      sinon.stub(utils, 'fetchJSON').resolves(pollResponse);

      localDb.allDocs.resolves({ rows: [] });
      localDb.get
        .onCall(0).rejects({ status: 404 })
        .resolves({ _id: FLAG_ID, start_time: 0 });
      localDb.put.resolves();

      remoteDb.bulkGet.resolves({
        results: [
          { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], },
          { id: 'two', docs: [{ ok: { _id: 'two', _rev: 1, field: 'two' } }], },
          { id: 'three', docs: [{ ok: { _id: 'three', _rev: 1, field: 'three' } }], },
          { id: 'four', docs: [{ ok: { _id: 'four', _rev: 1, field: 'four' } }], },
          { id: 'five', docs: [{ ok: { _id: 'five', _rev: 1, field: 'five' } }], },
        ]
      });

      localDb.replicate.from.returns(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 200 });
      const displayTooManyDocsWarning = sinon.stub().resolves();
      initialReplication.__set__('displayTooManyDocsWarning', displayTooManyDocsWarning);

      await initialReplication.replicate(remoteDb, localDb);

      expect(utils.fetchJSON.args).to.deep.equal([['/api/v1/initial-replication/get-ids']]);
      expect(displayTooManyDocsWarning.args).to.deep.equal([[pollResponse]]);
      expect(localDb.put.args).to.deep.equal([
        [{
          _id: FLAG_ID,
          start_time: 0,
          start_data_usage: undefined,
        }],
        [{
          _id: FLAG_ID,
          complete: true,
          data_usage: undefined,
          duration: 0,
          start_time: 0,
        }]
      ]);

      expect(localDb.replicate.from.args).to.deep.equal([[
        remoteDb,
        {
          live: false,
          retry: false,
          heartbeat: 10000,
          timeout: 1000 * 60 * 10, // try for ten minutes then give up,
          query_params: { initial_replication: true },
          since: '456-fdhsfs',
        }
      ]]);

      expect(localDb.replicate.to.args).to.deep.equal([[
        remoteDb,
        { since: 200 },
      ]]);
    });

    it('should throw fetch docs errors', async () => {
      sinon.stub(utils, 'fetchJSON').rejects(new Error('failed to fetch'));

      await expect(initialReplication.replicate(remoteDb, localDb)).to.be.rejectedWith(Error, 'failed to fetch');

      expect(localDb.put.args).to.deep.equal([[{
        _id: FLAG_ID,
        start_data_usage: undefined,
        start_time: 0,
      }]]);
      expect(localDb.replicate.from.callCount).to.equal(0);
      expect(localDb.replicate.to.callCount).to.equal(0);
    });

    it('should throw local _all_docs errors', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [ { id: 'one', rev: 1 }, { id: 'two', rev: 1 }, ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.rejects(new Error('global failure'));

      await expect(initialReplication.replicate(remoteDb, localDb)).to.be.rejectedWith(Error, 'global failure');

      expect(localDb.put.args).to.deep.equal([[{
        _id: FLAG_ID,
        start_data_usage: undefined,
        start_time: 0,
      }]]);
      expect(localDb.replicate.from.callCount).to.equal(0);
      expect(localDb.replicate.to.callCount).to.equal(0);
    });

    it('should throw remote _bulk_get errors', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [ { id: 'one', rev: 1 }, { id: 'two', rev: 1 }, ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });

      remoteDb.bulkGet.rejects(new Error('502'));

      await expect(initialReplication.replicate(remoteDb, localDb)).to.be.rejectedWith(Error, '502');

      expect(localDb.put.args).to.deep.equal([[{
        _id: FLAG_ID,
        start_data_usage: undefined,
        start_time: 0,
      }]]);
      expect(localDb.replicate.from.callCount).to.equal(0);
      expect(localDb.replicate.to.callCount).to.equal(0);
    });

    it('should throw local _bulk_docs errors', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [ { id: 'one', rev: 1 }, { id: 'two', rev: 1 }, ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });

      remoteDb.bulkGet.resolves({
        results: [
          { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], },
          { id: 'two', docs: [{ ok: { _id: 'two', _rev: 1, field: 'two' } }], },
        ]
      });

      localDb.bulkDocs.rejects(new Error('timeout'));

      await expect(initialReplication.replicate(remoteDb, localDb)).to.be.rejectedWith(Error, 'timeout');

      expect(localDb.put.args).to.deep.equal([[{
        _id: FLAG_ID,
        start_data_usage: undefined,
        start_time: 0,
      }]]);
      expect(localDb.replicate.from.callCount).to.equal(0);
      expect(localDb.replicate.to.callCount).to.equal(0);
    });

    it('should throw replicate from errors', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [ { id: 'four', rev: 3 }, { id: 'five', rev: 1 }, ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });
      remoteDb.bulkGet.resolves({
        results: [
          { id: 'four', docs: [{ ok: { _id: 'four', _rev: 1, field: 'four' } }], },
          { id: 'five', docs: [{ ok: { _id: 'five', _rev: 1, field: 'five' } }], },
        ]
      });
      localDb.bulkDocs.resolves();
      localDb.get.rejects({ status: 404 });
      localDb.put.resolves();

      const err = Promise.reject('boom?');
      err.on = sinon.stub();
      localDb.replicate.from.returns(err);

      await expect(initialReplication.replicate(remoteDb, localDb)).to.be.rejectedWith( 'boom?');

      expect(localDb.put.args).to.deep.equal([[{
        _id: FLAG_ID,
        start_data_usage: undefined,
        start_time: 0,
      }]]);
    });

    it('should throw replicate to errors', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [ { id: 'five', rev: 1 }, ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });

      remoteDb.bulkGet.resolves({
        results: [ { id: 'five', docs: [{ ok: { _id: 'five', _rev: 1, field: 'five' } }], }, ]
      });

      localDb.bulkDocs.resolves();
      localDb.get.rejects({ status: 404 });
      localDb.put.resolves();

      localDb.replicate.from.returns(onPromise);
      localDb.info.resolves({ update_seq: 7 });
      localDb.replicate.to.rejects(new Error('gone'));

      await expect(initialReplication.replicate(remoteDb, localDb)).to.be.rejectedWith(Error, 'gone');

      expect(localDb.put.args).to.deep.equal([[{
        _id: FLAG_ID,
        start_data_usage: undefined,
        start_time: 0,
      }]]);
    });

    it('should throw local put errors', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [ { id: 'one', rev: 1 }, ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });
      remoteDb.bulkGet.resolves({
        results: [ { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], }, ]
      });

      localDb.bulkDocs.resolves();
      localDb.get.rejects({ status: 404 });
      localDb.put.rejects(new Error('boom!'));

      localDb.replicate.from.resolves();
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 5 });

      await expect(initialReplication.replicate(remoteDb, localDb)).to.be.rejectedWith(Error, 'boom!');
    });

    it('should throw error when there is no replication log to complete', async () => {
      sinon.stub(utils, 'fetchJSON').resolves({
        doc_ids_revs: [ { id: 'one', rev: 1 }, ],
        warn_docs: 5,
        last_seq: '123-fdhsfs',
        warn: false,
        limit: 10000
      });

      localDb.allDocs.resolves({ rows: [] });
      remoteDb.bulkGet.resolves({
        results: [ { id: 'one', docs: [{ ok: { _id: 'one', _rev: 1, field: 'one' } }], }, ]
      });

      localDb.bulkDocs.resolves();
      localDb.get.rejects({ status: 404 });
      localDb.put.resolves();

      localDb.replicate.from.returns(onPromise);
      localDb.replicate.to.resolves();
      localDb.info.resolves({ update_seq: 5 });

      await expect(initialReplication.replicate(remoteDb, localDb))
        .to.be.rejectedWith(Error, 'Invalid replication state: missing replication log');
    });
  });
});
