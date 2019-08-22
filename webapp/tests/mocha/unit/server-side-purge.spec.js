const serverSidePurge = require('../../../src/js/bootstrapper/server-side-purge');
const sinon = require('sinon');
const chai = require('chai');
const moment = require('moment');
const pouchDbOptions = {
  local: { auto_compaction: true },
  remote: { skip_setup: true },
  remote_headers: { 'Accept': 'application/json', 'medic-replication-id': 'some-uuid' }
};

let originalWindow;
let originalFetch;
let localDb;

describe('ServerSidePurge', () => {
  afterEach(() => {
    originalFetch ? fetch = originalFetch : fetch = undefined;
    originalWindow ? fetch = originalWindow : window = undefined;
    sinon.restore();
  });

  beforeEach(done => {
    if (typeof window !== 'undefined') {
      originalWindow = window;
    }

    if (typeof fetch !== 'undefined') {
      originalFetch = fetch;
    }

    window = {
      location: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '5988',
        pathname: '/',
        href: 'http://localhost:5988/'
      },
      localStorage: {
        getItem: sinon.stub()
      }
    };

    fetch = sinon.stub();
    serverSidePurge.setOptions(pouchDbOptions);
    localDb = {
      get: sinon.stub(),
      allDocs: sinon.stub(),
      bulkDocs: sinon.stub(),
      info: sinon.stub(),
      put: sinon.stub(),
    };
    done();
  });

  describe('info', () => {
    it('should request info', () => {
      fetch.resolves({ json: sinon.stub().resolves({ some: 'info', update_seq: '22-seq' }) });
      return serverSidePurge.info().then(result => {
        chai.expect(result).to.equal('22-seq');
        chai.expect(fetch.callCount).to.equal(1);
        chai.expect(fetch.args[0]).to.deep.equal([
          'http://localhost:5988/purging',
          { headers: { 'Accept': 'application/json', 'medic-replication-id': 'some-uuid' } }
        ]);
      });
    });

    it('should throw fetch errors', () => {
      fetch.rejects({ some: 'error' });
      return serverSidePurge.info().catch(err => {
        chai.expect(err).to.deep.equal({ some: 'error' });
      });
    });
  });

  describe('checkpoint', () => {
    it('should throw fetch errors', () => {
      fetch.rejects({ some: 'error' });
      return serverSidePurge.checkpoint().catch(err => {
        chai.expect(err).to.deep.equal({ some: 'error' });
        chai.expect(fetch.callCount).to.equal(1);
      });
    });

    it('should call purge checkpoint with `now` when no seq provided', () => {
      fetch.resolves({ json: sinon.stub().resolves() });
      return serverSidePurge.checkpoint().then(() => {
        chai.expect(fetch.callCount).to.equal(1);
        chai.expect(fetch.args[0]).to.deep.equal([
          'http://localhost:5988/purging/checkpoint?seq=now',
          { headers: { 'Accept': 'application/json', 'medic-replication-id': 'some-uuid' } }
        ]);
      });
    });

    it('should call purge checkpoint with provided seq', () => {
      fetch.resolves({ json: sinon.stub().resolves() });
      return serverSidePurge.checkpoint('my-seq').then(() => {
        chai.expect(fetch.callCount).to.equal(1);
        chai.expect(fetch.args[0]).to.deep.equal([
          'http://localhost:5988/purging/checkpoint?seq=my-seq',
          { headers: { 'Accept': 'application/json', 'medic-replication-id': 'some-uuid' } }
        ]);
      });
    });
  });

  describe('shouldPurge', () => {
    it('should throw db errors', () => {
      localDb.get.withArgs('settings').rejects({ some: 'error' });
      localDb.get.withArgs('_local/purgelog').rejects({ some: 'err' });
      return serverSidePurge.shouldPurge(localDb).catch(err => {
        chai.expect(err).to.deep.equal({ some: 'error' });
        chai.expect(localDb.get.callCount).to.equal(2);
        chai.expect(localDb.get.args).to.deep.equal([['settings'], ['_local/purgelog']]);
      });
    });

    it('should not throw an error when the purgelog is not found', () => {
      localDb.get.withArgs('settings').resolves({ settings: {} });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });

      return serverSidePurge.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(false);
        chai.expect(localDb.get.callCount).to.equal(2);
        chai.expect(localDb.get.args).to.deep.equal([['settings'], ['_local/purgelog']]);
      });
    });

    it('should throw an error when settings doc is malformed', () => {
      localDb.get.withArgs('settings').resolves({  });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });

      return serverSidePurge.shouldPurge(localDb).catch(err => {
        chai.assert(err);
      });
    });

    it('should return false when purge is not configured', () => {
      localDb.get.withArgs('settings').resolves({ settings: {} });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });

      return serverSidePurge.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return false when purging ran recently without a configured interval', () => {
      const purgeDate = moment().subtract('3', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: {} } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate });

      return serverSidePurge.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return false when purging ran recently with a configured interval', () => {
      const purgeDate = moment().subtract('8', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: { run_every_days: 10 } } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate });

      return serverSidePurge.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return false when local db is not synced upwards', () => {
      const purgeDate = moment().subtract('10', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: { } } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate });
      localDb.info.resolves({ update_seq: '1234' });
      window.localStorage.getItem.returns('1233');

      return serverSidePurge.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(false);
        chai.expect(window.localStorage.getItem.callCount).to.equal(1);
        chai.expect(window.localStorage.getItem.args[0]).to.deep.equal(['medic-last-replicated-seq']);
      });
    });

    it('should return true when db is synced and purge never ran', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge: { } } });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });

      localDb.info.resolves({ update_seq: '1234' });
      window.localStorage.getItem.returns('1234');

      return serverSidePurge.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(true);
      });
    });

    it('should return true when db is synced and purge ran before the default interval', () => {
      const purgeDate = moment().subtract('9', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: { } } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate });

      localDb.info.resolves({ update_seq: '1234' });
      window.localStorage.getItem.returns('1234');

      return serverSidePurge.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(true);
      });
    });

    it('should return true when db is synced and purge ran before the configured interval', () => {
      const purgeDate = moment().subtract('41', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: { run_every_days: 40 } } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate });

      localDb.info.resolves({ update_seq: '1234' });
      window.localStorage.getItem.returns('1234');

      return serverSidePurge.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(true);
      });
    });
  });

  describe('purge', () => {
    let clock;
    beforeEach(() => clock = sinon.useFakeTimers());
    afterEach(() => clock.restore());

    it('should "purge" all returned ids and creates purgelog when finished', () => {
      const purgeChanges = fetch.withArgs('http://localhost:5988/purging/changes');
      const purgeCheckpoint = fetch.withArgs(sinon.match('http://localhost:5988/purging/checkpoint')); // omit seq param
      purgeChanges
        .onCall(0).resolves({ json: sinon.stub().resolves({ purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' })})
        .onCall(1).resolves({ json: sinon.stub().resolves({ purged_ids: [], last_seq: '111-222' })});
      purgeCheckpoint.resolves({ json: sinon.stub().resolves() });

      localDb.allDocs
        .withArgs({ keys: ['id1', 'id2', 'id3'] })
        .resolves({ rows: [
            { id: 'id1', key: 'id1', value: { rev: '11-abc' } },
            { id: 'id2', key: 'id2', value: { rev: '12-abc' } },
            { id: 'id3', key: 'id3', value: { rev: '13-abc' } },
          ]});

      localDb.bulkDocs.resolves([]);
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      localDb.put.resolves();
      clock.tick(10000);

      return serverSidePurge.purge(localDb).then(() => {
        chai.expect(purgeChanges.callCount).to.equal(2);
        chai.expect(purgeChanges.args[0][1]).to.deep.equal({ headers: pouchDbOptions.remote_headers });
        chai.expect(purgeChanges.args[1][1]).to.deep.equal({ headers: pouchDbOptions.remote_headers });
        chai.expect(localDb.allDocs.callCount).to.equal(1);
        chai.expect(localDb.allDocs.args[0]).to.deep.equal([{ keys: ['id1', 'id2', 'id3'] }]);
        chai.expect(localDb.bulkDocs.callCount).to.equal(1);
        chai.expect(localDb.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'id1', _rev: '11-abc', _deleted: true, purged: true },
          { _id: 'id2', _rev: '12-abc', _deleted: true, purged: true },
          { _id: 'id3', _rev: '13-abc', _deleted: true, purged: true },
        ]]);
        chai.expect(purgeCheckpoint.callCount).to.equal(1);
        chai.expect(purgeCheckpoint.args[0]).to.deep.equal([
          'http://localhost:5988/purging/checkpoint?seq=111-222',
          { headers: pouchDbOptions.remote_headers },
        ]);
        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
        chai.expect(localDb.put.callCount).to.equal(1);
        chai.expect(localDb.put.args[0]).to.deep.equal([{
          _id: '_local/purgelog',
          date: 10000,
          count: 3,
          history: [ { date: 10000, count: 3 } ]
        }]);
      });
    });

    it('should keep requesting purged ids untill no results are returned', () => {
      const purgeChanges = fetch.withArgs('http://localhost:5988/purging/changes');
      const purgeCheckpoint = fetch.withArgs(sinon.match('http://localhost:5988/purging/checkpoint')).resolves({ json: sinon.stub() });

      purgeChanges
        .onCall(0).resolves({ json: sinon.stub().resolves({ purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' })})
        .onCall(1).resolves({ json: sinon.stub().resolves({ purged_ids: ['id4', 'id5', 'id6'], last_seq: '121-222' })})
        .onCall(2).resolves({ json: sinon.stub().resolves({ purged_ids: ['id7', 'id8', 'id9'], last_seq: '131-222' })})
        .onCall(3).resolves({ json: sinon.stub().resolves({ purged_ids: [], last_seq: '131-222' })});

      const allDocsMock = ({ keys }) => Promise.resolve({ rows: keys.map(id => ({ id, key: id, value: { rev: `${id}-rev` } })) });
      localDb.allDocs.callsFake(allDocsMock);
      localDb.bulkDocs.resolves([]);

      localDb.get.withArgs('_local/purgelog').resolves({
        _id: '_local/purgelog',
        date: 1000,
        count: 3,
        history: [
          { date: 1000, count: 3 },
          { date: 900, count: 0 },
          { date: 800, count: 5 },
        ]
      });
      localDb.put.resolves();
      clock.tick(5000);

      return serverSidePurge.purge(localDb).then(() => {
        chai.expect(purgeChanges.callCount).to.equal(4);

        chai.expect(localDb.allDocs.callCount).to.equal(3);
        chai.expect(localDb.allDocs.args[0]).to.deep.equal([{ keys: ['id1', 'id2', 'id3'] }]);
        chai.expect(localDb.allDocs.args[1]).to.deep.equal([{ keys: ['id4', 'id5', 'id6'] }]);
        chai.expect(localDb.allDocs.args[2]).to.deep.equal([{ keys: ['id7', 'id8', 'id9'] }]);

        chai.expect(localDb.bulkDocs.callCount).to.equal(3);
        chai.expect(localDb.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'id1', _rev: 'id1-rev', _deleted: true, purged: true },
          { _id: 'id2', _rev: 'id2-rev', _deleted: true, purged: true },
          { _id: 'id3', _rev: 'id3-rev', _deleted: true, purged: true },
        ]]);
        chai.expect(localDb.bulkDocs.args[1]).to.deep.equal([[
          { _id: 'id4', _rev: 'id4-rev', _deleted: true, purged: true },
          { _id: 'id5', _rev: 'id5-rev', _deleted: true, purged: true },
          { _id: 'id6', _rev: 'id6-rev', _deleted: true, purged: true },
        ]]);
        chai.expect(localDb.bulkDocs.args[2]).to.deep.equal([[
          { _id: 'id7', _rev: 'id7-rev', _deleted: true, purged: true },
          { _id: 'id8', _rev: 'id8-rev', _deleted: true, purged: true },
          { _id: 'id9', _rev: 'id9-rev', _deleted: true, purged: true },
        ]]);

        chai.expect(purgeCheckpoint.callCount).to.equal(3);
        chai.expect(purgeCheckpoint.args[0][0]).to.equal('http://localhost:5988/purging/checkpoint?seq=111-222');
        chai.expect(purgeCheckpoint.args[1][0]).to.equal('http://localhost:5988/purging/checkpoint?seq=121-222');
        chai.expect(purgeCheckpoint.args[2][0]).to.equal('http://localhost:5988/purging/checkpoint?seq=131-222');

        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
        chai.expect(localDb.put.callCount).to.equal(1);
        chai.expect(localDb.put.args[0]).to.deep.equal([{
          _id: '_local/purgelog',
          date: 5000,
          count: 9,
          history: [
            { date: 5000, count: 9 },
            { date: 1000, count: 3 },
            { date: 900, count: 0 },
            { date: 800, count: 5 },
          ]
        }]);
      });
    });

    it('should skip updating docs that are not found', () => {
      const purgeChanges = fetch.withArgs('http://localhost:5988/purging/changes');
      const purgeCheckpoint = fetch.withArgs(sinon.match('http://localhost:5988/purging/checkpoint')).resolves({ json: sinon.stub() });

      purgeChanges
        .onCall(0).resolves({ json: sinon.stub().resolves({ purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' })})
        .onCall(1).resolves({ json: sinon.stub().resolves({ purged_ids: [], last_seq: '111-222' })});

      localDb.allDocs
        .withArgs({ keys: ['id1', 'id2', 'id3'] })
        .resolves({ rows: [
            { key: 'id1', error: 'whatever' },
            { key: 'id2', error: 'not_found', reason: 'deleted' },
            { id: 'id3', key: 'id3', value: { rev: '13-abc' } },
          ]});

      localDb.bulkDocs.resolves([]);

      localDb.get.withArgs('_local/purgelog').resolves({
        _id: '_local/purgelog',
        date: 1200,
        count: 3,
        history: [
          { date: 1200, count: 3 },
          { date: 1100, count: 0 },
          { date: 1000, count: 5 },
          { date: 900, count: 5 },
          { date: 800, count: 5 },
          { date: 700, count: 5 },
          { date: 600, count: 5 },
          { date: 500, count: 5 },
          { date: 400, count: 5 },
          { date: 300, count: 5 },
          { date: 200, count: 5 },
          { date: 100, count: 5 },
          { date: 0, count: 5 },
        ]
      });
      localDb.put.resolves();
      clock.tick(5000);

      return serverSidePurge.purge(localDb).then(() => {
        chai.expect(purgeChanges.callCount).to.equal(2);
        chai.expect(localDb.allDocs.callCount).to.equal(1);
        chai.expect(localDb.allDocs.args[0]).to.deep.equal([{ keys: ['id1', 'id2', 'id3'] }]);
        chai.expect(localDb.bulkDocs.callCount).to.equal(1);
        chai.expect(localDb.bulkDocs.args[0]).to.deep.equal([[{ _id: 'id3', _rev: '13-abc', _deleted: true, purged: true }]]);
        chai.expect(purgeCheckpoint.callCount).to.equal(1);
        chai.expect(purgeCheckpoint.args[0][0]).to.equal('http://localhost:5988/purging/checkpoint?seq=111-222');

        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
        chai.expect(localDb.put.callCount).to.equal(1);
        chai.expect(localDb.put.args[0]).to.deep.equal([{
          _id: '_local/purgelog',
          date: 5000,
          count: 1,
          history: [
            { date: 5000, count: 1 },
            { date: 1200, count: 3 },
            { date: 1100, count: 0 },
            { date: 1000, count: 5 },
            { date: 900, count: 5 },
            { date: 800, count: 5 },
            { date: 700, count: 5 },
            { date: 600, count: 5 },
            { date: 500, count: 5 },
            { date: 400, count: 5 },
          ]
        }]);
      });
    });

    it('should throw an error when purge save is not successful', () => {
      const purgeChanges = fetch.withArgs('http://localhost:5988/purging/changes');
      const purgeCheckpoint = fetch.withArgs(sinon.match('http://localhost:5988/purging/checkpoint')).resolves({ json: sinon.stub() });

      purgeChanges.resolves({ json: sinon.stub().resolves({ purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' })});

      localDb.allDocs
        .withArgs({ keys: ['id1', 'id2', 'id3'] })
        .resolves({ rows: [
            { id: 'id1', key: 'id1', value: { rev: '11-abc' } },
            { id: 'id2', key: 'id2', value: { rev: '12-abc' } },
            { id: 'id3', key: 'id3', value: { rev: '13-abc' } },
          ]});

      localDb.bulkDocs.resolves([
        { id: 'id1', error: 'conflict' },
        { id: 'id2', ok: true, rev: 'new' },
        { id: 'id3', error: 'whatever' }
      ]);

      return serverSidePurge.purge(localDb).catch((err) => {
        chai.expect(err.message.startsWith('Not all documents purged successfully')).to.equal(true);
        chai.expect(purgeChanges.callCount).to.equal(1);
        chai.expect(localDb.allDocs.callCount).to.equal(1);
        chai.expect(localDb.bulkDocs.callCount).to.equal(1);
        chai.expect(purgeCheckpoint.callCount).to.equal(0);
        chai.expect(localDb.get.callCount).to.equal(0);
        chai.expect(localDb.put.callCount).to.equal(0);
      });
    });
  });
});
