const purger = require('../../../src/ts/bootstrapper/purger');
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
let userCtx;

describe('Purger', () => {
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
    };

    fetch = sinon.stub();
    purger.setOptions(pouchDbOptions);
    localDb = {
      get: sinon.stub(),
      allDocs: sinon.stub(),
      bulkDocs: sinon.stub(),
      put: sinon.stub(),
    };
    userCtx = { roles: [] };
    done();
  });

  describe('info', () => {
    it('should request info', () => {
      fetch.resolves({ json: sinon.stub().resolves({ some: 'info', update_seq: '22-seq' }) });
      return purger.info().then(result => {
        chai.expect(result).to.equal('22-seq');
        chai.expect(fetch.callCount).to.equal(1);
        chai.expect(fetch.args[0]).to.deep.equal([
          'http://localhost:5988/purging',
          { headers: { 'Accept': 'application/json', 'medic-replication-id': 'some-uuid' }, credentials: 'same-origin' }
        ]);
      });
    });

    it('should throw when fetch rejects', done => {
      fetch.rejects({ some: 'error' });
      purger.info()
        .then(() => {
          done(new Error('Expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          done();
        });
    });

    it('should throw when fetch resolves with an error code', done => {
      fetch.resolves({ json: sinon.stub().resolves({ code: 500, error: 'Server error' }) });
      purger.info()
        .then(() => {
          done(new Error('Expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err.message).to.equal('Error fetching purge data: {"code":500,"error":"Server error"}');
          done();
        });
    });
  });

  describe('checkpoint', () => {

    it('should throw when fetch rejects', done => {
      fetch.rejects({ some: 'error' });
      purger.checkpoint('seq')
        .then(() => {
          done(new Error('Expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'error' });
          chai.expect(fetch.callCount).to.equal(1);
          done();
        });
    });

    it('should throw when fetch resolves with an error code', done => {
      fetch.resolves({ json: sinon.stub().resolves({ code: 500, error: 'Server error' }) });
      purger.checkpoint('seq')
        .then(() => {
          done(new Error('Expected error to be thrown'));
        })
        .catch(err => {
          chai.expect(err.message).to.equal('Error fetching purge data: {"code":500,"error":"Server error"}');
          chai.expect(fetch.callCount).to.equal(1);
          done();
        });
    });

    it('should not call purge checkpoint when no seq provided', () => {
      return purger.checkpoint().then(() => {
        chai.expect(fetch.callCount).to.equal(0);
      });
    });

    it('should call purge checkpoint with provided seq', () => {
      fetch.resolves({ json: sinon.stub().resolves() });
      return purger.checkpoint('my-seq').then(() => {
        chai.expect(fetch.callCount).to.equal(1);
        chai.expect(fetch.args[0]).to.deep.equal([
          'http://localhost:5988/purging/checkpoint?seq=my-seq',
          { headers: { 'Accept': 'application/json', 'medic-replication-id': 'some-uuid' }, credentials: 'same-origin' }
        ]);
      });
    });
  });

  describe('shouldPurge', () => {
    it('should return false on local db errors', () => {
      localDb.get.withArgs('settings').rejects({ some: 'error' });
      localDb.get.withArgs('_local/purgelog').rejects({ some: 'err' });
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });
      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(false);
        chai.expect(localDb.get.callCount).to.equal(2);
        chai.expect(localDb.get.args).to.deep.equal([['settings'], ['_local/purgelog']]);
        chai.expect(fetch.callCount).to.equal(1);
        chai.expect(fetch.args[0]).to.deep.equal([
          'http://localhost:5988/purging',
          { headers: { 'Accept': 'application/json', 'medic-replication-id': 'some-uuid' }, credentials: 'same-origin' }
        ]);
      });
    });

    it('should not throw an error when the purgelog is not found', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge: {} } });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(true);
        chai.expect(localDb.get.callCount).to.equal(2);
        chai.expect(localDb.get.args).to.deep.equal([['settings'], ['_local/purgelog']]);
        chai.expect(fetch.callCount).to.equal(1);
      });
    });

    it('should return false when settings doc is malformed', () => {
      localDb.get.withArgs('settings').resolves({  });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should catch connectivity errors', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge: {} } });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      fetch.rejects({ some: 'err' });

      return purger.shouldPurge(localDb).then(result => {
        chai.expect(result).to.equal(false);
        chai.expect(localDb.get.callCount).to.equal(2);
        chai.expect(localDb.get.args).to.deep.equal([['settings'], ['_local/purgelog']]);
        chai.expect(fetch.callCount).to.equal(1);
        chai.expect(fetch.args[0]).to.deep.equal([
          'http://localhost:5988/purging',
          { headers: { 'Accept': 'application/json', 'medic-replication-id': 'some-uuid' }, credentials: 'same-origin' }
        ]);
      });
    });

    it('should return false when purge is not configured', () => {
      localDb.get.withArgs('settings').resolves({ settings: {} });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return false when purge db does not exist', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge: { } } });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      fetch.resolves({ json: sinon.stub().resolves(false) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return false when purging ran recently without a configured interval', () => {
      const purgeDate = moment().subtract('3', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: {} } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate });
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return false when purging ran recently with a configured interval', () => {
      const purgeDate = moment().subtract('8', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: { run_every_days: 10 } } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate });
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(false);
      });
    });

    it('should return true when purge never ran', () => {
      localDb.get.withArgs('settings').resolves({ settings: { purge: { } } });
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(true);
      });
    });

    it('should return true when purge ran before the default interval', () => {
      const purgeDate = moment().subtract('9', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: { } } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate, roles: JSON.stringify(['a', 'c']) });
      userCtx.roles = ['c', 'a'];
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(true);
      });
    });

    it('should return true when purge ran before the configured interval', () => {
      const purgeDate = moment().subtract('41', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: { run_every_days: 40 } } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate, roles: JSON.stringify(['a', 'x']) });
      userCtx.roles = ['a', 'x'];
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
        chai.expect(result).to.equal(true);
      });
    });

    it('should return true when user roles have changed', () => {
      const purgeDate = moment().subtract('1', 'days').valueOf();
      localDb.get.withArgs('settings').resolves({ settings: { purge: { } } });
      localDb.get.withArgs('_local/purgelog').resolves({ date: purgeDate, roles: JSON.stringify(['a', 'b', 'x']) });
      userCtx.roles = ['a', 'x'];
      fetch.resolves({ json: sinon.stub().resolves({ update_seq: '123' }) });

      return purger.shouldPurge(localDb, userCtx).then(result => {
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
      userCtx.roles = ['two', 'one', 'two', 'one', 'three'];

      return purger.purge(localDb, userCtx).then(() => {
        chai.expect(purgeChanges.callCount).to.equal(2);
        chai.expect(purgeChanges.args[0][1])
          .to.deep.equal({ headers: pouchDbOptions.remote_headers, credentials: 'same-origin' });
        chai.expect(purgeChanges.args[1][1])
          .to.deep.equal({ headers: pouchDbOptions.remote_headers, credentials: 'same-origin' });
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
          { headers: pouchDbOptions.remote_headers, credentials: 'same-origin' },
        ]);
        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
        chai.expect(localDb.put.callCount).to.equal(1);
        chai.expect(localDb.put.args[0]).to.deep.equal([{
          _id: '_local/purgelog',
          date: 10000,
          count: 3,
          roles: JSON.stringify(['one', 'three', 'two']),
          history: [ { date: 10000, count: 3, roles: JSON.stringify(['one', 'three', 'two']) } ]
        }]);
      });
    });

    it('should keep requesting purged ids until no results are returned', () => {
      const purgeChanges = fetch.withArgs('http://localhost:5988/purging/changes');
      const purgeCheckpoint = fetch.withArgs(sinon.match('http://localhost:5988/purging/checkpoint'))
        .resolves({ json: sinon.stub() });

      purgeChanges
        .onCall(0).resolves({ json: sinon.stub().resolves({ purged_ids: ['id1', 'id2', 'id3'], last_seq: '111-222' })})
        .onCall(1).resolves({ json: sinon.stub().resolves({ purged_ids: ['id4', 'id5', 'id6'], last_seq: '121-222' })})
        .onCall(2).resolves({ json: sinon.stub().resolves({ purged_ids: ['id7', 'id8', 'id9'], last_seq: '131-222' })})
        .onCall(3).resolves({ json: sinon.stub().resolves({ purged_ids: [], last_seq: '131-222' })});

      const allDocsMock = ({ keys }) => Promise.resolve({
        rows: keys.map(id => ({ id, key: id, value: { rev: `${id}-rev` } }))
      });
      localDb.allDocs.callsFake(allDocsMock);
      localDb.bulkDocs.resolves([]);
      const rolesABC = JSON.stringify(['a', 'b', 'c']);

      localDb.get.withArgs('_local/purgelog').resolves({
        _id: '_local/purgelog',
        date: 1000,
        count: 3,
        roles: rolesABC,
        history: [
          { date: 1000, count: 3, roles: rolesABC },
          { date: 900, count: 0, roles: rolesABC },
          { date: 800, count: 5, roles: rolesABC },
        ]
      });
      localDb.put.resolves();
      clock.tick(5000);
      userCtx.roles = ['b', 'c', 'a'];

      return purger.purge(localDb, userCtx).then(() => {
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
          roles: rolesABC,
          history: [
            { date: 5000, count: 9, roles: rolesABC },
            { date: 1000, count: 3, roles: rolesABC },
            { date: 900, count: 0, roles: rolesABC },
            { date: 800, count: 5, roles: rolesABC },
          ]
        }]);
      });
    });

    it('should skip updating docs that are not found', () => {
      const purgeChanges = fetch.withArgs('http://localhost:5988/purging/changes');
      const purgeCheckpoint = fetch.withArgs(sinon.match('http://localhost:5988/purging/checkpoint'))
        .resolves({ json: sinon.stub() });

      purgeChanges
        .onCall(0)
        .resolves({ json: sinon.stub().resolves({ purged_ids: ['id1', 'id2', 'id3', 'id4'], last_seq: '111-222' })})
        .onCall(1)
        .resolves({ json: sinon.stub().resolves({ purged_ids: [], last_seq: '111-222' })});

      localDb.allDocs
        .withArgs({ keys: ['id1', 'id2', 'id3', 'id4'] })
        .resolves({ rows: [
          { key: 'id1', error: 'whatever' },
          { key: 'id2', error: 'not_found', reason: 'deleted' },
          { id: 'id3', key: 'id3', value: { rev: '13-abc' } },
          { id: 'id4', key: 'id3', value: { rev: '13-abc', deleted: true } },
        ]});

      localDb.bulkDocs.resolves([]);

      const rolesJson = JSON.stringify(['1', '2', '3']);
      const rolesJsonTwo = JSON.stringify(['1', '2', '3', '4']);
      localDb.get.withArgs('_local/purgelog').resolves({
        _id: '_local/purgelog',
        date: 1200,
        count: 3,
        roles: rolesJson,
        history: [
          { date: 1200, count: 3, roles: rolesJson },
          { date: 1100, count: 0, roles: rolesJson },
          { date: 1000, count: 5, roles: rolesJson },
          { date: 900, count: 5, roles: rolesJson },
          { date: 800, count: 5, roles: rolesJson },
          { date: 700, count: 5, roles: rolesJson },
          { date: 600, count: 5, roles: rolesJson },
          { date: 500, count: 5, roles: rolesJson },
          { date: 400, count: 5, roles: rolesJson },
          { date: 300, count: 5, roles: rolesJsonTwo },
          { date: 200, count: 5, roles: rolesJsonTwo },
          { date: 100, count: 5, roles: rolesJsonTwo },
          { date: 0, count: 5, roles: rolesJsonTwo },
        ]
      });
      localDb.put.resolves();
      clock.tick(5000);
      userCtx.roles = ['c', 'b', 'a', 'a', 'b', '1', '3'];

      return purger.purge(localDb, userCtx).then(() => {
        chai.expect(purgeChanges.callCount).to.equal(2);
        chai.expect(localDb.allDocs.callCount).to.equal(1);
        chai.expect(localDb.allDocs.args[0]).to.deep.equal([{ keys: ['id1', 'id2', 'id3', 'id4'] }]);
        chai.expect(localDb.bulkDocs.callCount).to.equal(1);
        chai.expect(localDb.bulkDocs.args[0])
          .to.deep.equal([[{ _id: 'id3', _rev: '13-abc', _deleted: true, purged: true }]]);
        chai.expect(purgeCheckpoint.callCount).to.equal(1);
        chai.expect(purgeCheckpoint.args[0][0]).to.equal('http://localhost:5988/purging/checkpoint?seq=111-222');

        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
        chai.expect(localDb.put.callCount).to.equal(1);
        chai.expect(localDb.put.args[0]).to.deep.equal([{
          _id: '_local/purgelog',
          date: 5000,
          count: 1,
          roles: JSON.stringify(['1', '3', 'a', 'b', 'c']),
          history: [
            { date: 5000, count: 1, roles: JSON.stringify(['1', '3', 'a', 'b', 'c']) },
            { date: 1200, count: 3, roles: rolesJson },
            { date: 1100, count: 0, roles: rolesJson },
            { date: 1000, count: 5, roles: rolesJson },
            { date: 900, count: 5, roles: rolesJson },
            { date: 800, count: 5, roles: rolesJson },
            { date: 700, count: 5, roles: rolesJson },
            { date: 600, count: 5, roles: rolesJson },
            { date: 500, count: 5, roles: rolesJson },
            { date: 400, count: 5, roles: rolesJson },
          ]
        }]);
      });
    });

    it('should throw an error when purge save is not successful', () => {
      const purgeChanges = fetch.withArgs('http://localhost:5988/purging/changes');
      const purgeCheckpoint = fetch.withArgs(sinon.match('http://localhost:5988/purging/checkpoint'))
        .resolves({ json: sinon.stub() });

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

      return purger.purge(localDb, userCtx).catch((err) => {
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

  describe('shouldPurgeMeta', () => {
    beforeEach(() => {
      localDb = {
        get: sinon.stub(),
        put: sinon.stub(),
        changes: sinon.stub(),
        bulkDocs: sinon.stub(),
      };
    });

    it('should return falsy if no purgelog document exists', () => {
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      return purger.shouldPurgeMeta(localDb).then(result => {
        chai.expect(result).to.equal(undefined);
        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
      });
    });

    it('should return falsy if purge log document exists, but lacks a synced seq', () => {
      localDb.get.withArgs('_local/purgelog').resolves({ _id: '_local/purgelog' });
      return purger.shouldPurgeMeta(localDb).then(result => {
        chai.expect(result).to.equal(undefined);
      });
    });

    it('should return truthy when purgelog exists and synced_seq is set', () => {
      localDb.get.withArgs('_local/purgelog').resolves({ _id: '_local/purgelog', synced_seq: 1000 });
      return purger.shouldPurgeMeta(localDb).then(result => {
        chai.expect(result).to.equal(1000);
        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
      });
    });
  });

  describe('writePurgeMetaCheckpoint', () => {
    it('should set the synced_seq in the purge log', () => {
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      localDb.put.resolves();
      return purger.writePurgeMetaCheckpoint(localDb, 1000).then(() => {
        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
        chai.expect(localDb.put.callCount).to.equal(1);
        chai.expect(localDb.put.args[0]).to.deep.equal([{
          _id: '_local/purgelog',
          history: [],
          synced_seq: 1000,
        }]);
      });
    });

    it('should overwrite the synced seq', () => {
      localDb.get.withArgs('_local/purgelog').resolves({ _id: '_local/purgelog', synced_seq: 500 });
      localDb.put.resolves();
      return purger.writePurgeMetaCheckpoint(localDb, 1500).then(() => {
        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
        chai.expect(localDb.put.callCount).to.equal(1);
        chai.expect(localDb.put.args[0]).to.deep.equal([{
          _id: '_local/purgelog',
          synced_seq: 1500,
        }]);
      });
    });

    it('should not overwrite other purgelog fields', () => {
      localDb.get.withArgs('_local/purgelog').resolves({ _id: '_local/purgelog', synced_seq: 500, purged_seq: 500 });
      localDb.put.resolves();
      return purger.writePurgeMetaCheckpoint(localDb, 1500).then(() => {
        chai.expect(localDb.get.callCount).to.equal(1);
        chai.expect(localDb.get.args[0]).to.deep.equal(['_local/purgelog']);
        chai.expect(localDb.put.callCount).to.equal(1);
        chai.expect(localDb.put.args[0]).to.deep.equal([{
          _id: '_local/purgelog',
          synced_seq: 1500,
          purged_seq: 500,
        }]);
      });
    });
  });

  describe('purgeMeta', () => {
    beforeEach(() => {
      localDb = {
        get: sinon.stub(),
        put: sinon.stub(),
        changes: sinon.stub(),
        bulkDocs: sinon.stub(),
        allDocs: sinon.stub(),
      };
    });

    it('should iterate over 1000 changes between two sequences', () => {
      const start = 100;
      const end = 5000;

      localDb.get.withArgs('_local/purgelog').callsFake(() => {
        // calling this with .resolves ends up resolving with the same object variable and screws the test up
        return Promise.resolve({
          _id: '_local/purgelog',
          synced_seq: end,
          purged_seq: start,
        });
      });
      const genChanges = () => Array.from({ length: 100 }).map(() => ({ id: 'read:doc:...' }));

      localDb.changes
        .onCall(0).resolves({ last_seq: 200, results: genChanges() })
        .onCall(1).resolves({ last_seq: 300, results: genChanges() })
        .onCall(2).resolves({ last_seq: 400, results: genChanges() })
        .onCall(3).resolves({ last_seq: 500, results: genChanges() })
        .onCall(4).resolves({ last_seq: 600, results: genChanges() })
        .onCall(5).resolves({ last_seq: 700, results: genChanges() })
        .onCall(6).resolves({ last_seq: 800, results: genChanges() })
        .onCall(7).resolves({ last_seq: 900, results: genChanges() })
        .onCall(8).resolves({ last_seq: 1000, results: genChanges() })
        .onCall(9).resolves({ last_seq: 1100, results: genChanges() });

      return purger.purgeMeta(localDb).then(() => {
        chai.expect(localDb.put.callCount).to.equal(10);
        chai.expect(localDb.put.args[0]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 200 }]);
        chai.expect(localDb.put.args[1]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 300 }]);
        chai.expect(localDb.put.args[2]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 400 }]);
        chai.expect(localDb.put.args[3]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 500 }]);
        chai.expect(localDb.put.args[4]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 600 }]);
        chai.expect(localDb.put.args[5]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 700 }]);
        chai.expect(localDb.put.args[6]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 800 }]);
        chai.expect(localDb.put.args[7]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 900 }]);
        chai.expect(localDb.put.args[8]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 1000 }]);
        chai.expect(localDb.put.args[9]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 1100 }]);

        chai.expect(localDb.changes.callCount).to.equal(10);
        chai.expect(localDb.changes.args[0]).to.deep.equal([{ since: 100, limit: 100 }]);
        chai.expect(localDb.changes.args[1]).to.deep.equal([{ since: 200, limit: 100 }]);
        chai.expect(localDb.changes.args[2]).to.deep.equal([{ since: 300, limit: 100 }]);
        chai.expect(localDb.changes.args[3]).to.deep.equal([{ since: 400, limit: 100 }]);
        chai.expect(localDb.changes.args[4]).to.deep.equal([{ since: 500, limit: 100 }]);
        chai.expect(localDb.changes.args[5]).to.deep.equal([{ since: 600, limit: 100 }]);
        chai.expect(localDb.changes.args[6]).to.deep.equal([{ since: 700, limit: 100 }]);
        chai.expect(localDb.changes.args[7]).to.deep.equal([{ since: 800, limit: 100 }]);
        chai.expect(localDb.changes.args[8]).to.deep.equal([{ since: 900, limit: 100 }]);
        chai.expect(localDb.changes.args[9]).to.deep.equal([{ since: 1000, limit: 100 }]);

        chai.expect(localDb.bulkDocs.callCount).to.equal(0); // no feedbacks!
      });
    });

    it('should stop iterating when up to date', () => {
      const start = 100;
      const end = 320;

      localDb.get.withArgs('_local/purgelog').callsFake(() => {
        // calling this with .resolves ends up resolving with the same object variable and screws the test up
        return Promise.resolve({
          _id: '_local/purgelog',
          synced_seq: end,
          purged_seq: start,
        });
      });

      const genChanges = (length) => Array.from({ length }).map(() => ({ id: 'read:doc:...' }));

      localDb.changes
        .onCall(0).resolves({ last_seq: 200, results: genChanges(100) })
        .onCall(1).resolves({ last_seq: 300, results: genChanges(100) })
        .onCall(2).resolves({ last_seq: 320, results: genChanges(100) })
        .onCall(3).resolves({ last_seq: 320, results: [] });

      return purger.purgeMeta(localDb).then(() => {
        chai.expect(localDb.put.callCount).to.equal(3);

        chai.expect(localDb.put.args[0]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 200 }]);
        chai.expect(localDb.put.args[1]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 300 }]);
        chai.expect(localDb.put.args[2]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 320 }]);

        chai.expect(localDb.changes.callCount).to.equal(3);
        chai.expect(localDb.changes.args[0]).to.deep.equal([{ since: 100, limit: 100 }]);
        chai.expect(localDb.changes.args[1]).to.deep.equal([{ since: 200, limit: 100 }]);
        chai.expect(localDb.changes.args[2]).to.deep.equal([{ since: 300, limit: 100 }]);

        chai.expect(localDb.bulkDocs.callCount).to.equal(0); // no feedbacks!
      });
    });

    it('should stop iterating when reaching end of changes feed', () => {
      const start = 100;
      const end = 320;

      localDb.get.withArgs('_local/purgelog').callsFake(() => {
        // calling this with .resolves ends up resolving with the same object variable and screws the test up
        return Promise.resolve({
          _id: '_local/purgelog',
          synced_seq: end,
          purged_seq: start,
        });
      });

      const genChanges = (length) => Array.from({ length }).map(() => ({ id: 'read:doc:...' }));

      localDb.changes
        .onCall(0).resolves({ last_seq: 200, results: genChanges(100) })
        .onCall(1).resolves({ last_seq: 300, results: genChanges(100) })
        .onCall(2).resolves({ last_seq: 320, results: genChanges(20) })
        .onCall(3).resolves({ last_seq: 320, results: [] });

      return purger.purgeMeta(localDb).then(() => {
        chai.expect(localDb.put.callCount).to.equal(3);
        chai.expect(localDb.put.args[0]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 200 }]);
        chai.expect(localDb.put.args[1]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 300 }]);
        chai.expect(localDb.put.args[2]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 320 }]);

        chai.expect(localDb.changes.callCount).to.equal(3);
        chai.expect(localDb.changes.args[0]).to.deep.equal([{ since: 100, limit: 100 }]);
        chai.expect(localDb.changes.args[1]).to.deep.equal([{ since: 200, limit: 100 }]);
        chai.expect(localDb.changes.args[2]).to.deep.equal([{ since: 300, limit: 100 }]);

        chai.expect(localDb.bulkDocs.callCount).to.equal(0); // no feedbacks!
      });
    });

    it('should stop iterating when reaching end sequence', () => {
      const start = 100;
      const end = 223;

      localDb.get.withArgs('_local/purgelog').callsFake(() => {
        // calling this with .resolves ends up resolving with the same object variable and screws the test up
        return Promise.resolve({
          _id: '_local/purgelog',
          synced_seq: end,
          purged_seq: start,
        });
      });

      const genChanges = (length) => Array.from({ length }).map(() => ({ id: 'read:doc:...' }));

      localDb.changes
        .onCall(0).resolves({ last_seq: 200, results: genChanges(100) })
        .onCall(1).resolves({ last_seq: 300, results: genChanges(100) });

      return purger.purgeMeta(localDb).then(() => {
        chai.expect(localDb.put.callCount).to.equal(2);
        chai.expect(localDb.put.args[0]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 200 }]);
        chai.expect(localDb.put.args[1]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 223 }]);

        chai.expect(localDb.changes.callCount).to.equal(2);
        chai.expect(localDb.changes.args[0]).to.deep.equal([{ since: 100, limit: 100 }]);
        chai.expect(localDb.changes.args[1]).to.deep.equal([{ since: 200, limit: 100 }]);

        chai.expect(localDb.bulkDocs.callCount).to.equal(0); // no feedbacks!
      });
    });

    it('should purge all feedback and telemetry docs, skip deleted docs and not purge past synced_seq', () => {
      const start = 100;
      const end = 223;

      localDb.get.withArgs('_local/purgelog').callsFake(() => {
        // calling this with .resolves ends up resolving with the same object variable and screws the test up
        return Promise.resolve({
          _id: '_local/purgelog',
          synced_seq: end,
          purged_seq: start,
        });
      });

      localDb.allDocs
        .withArgs({ keys: ['feedback-doc:1', 'feedback-doc:2', 'telemetry-1'] })
        .resolves({ rows: [
          { id: 'feedback-doc:1', value: { rev: 1 } },
          { id: 'feedback-doc:2', value: { rev: 1 } },
          { id: 'telemetry-1', value: { rev: 1 } },
        ] });
      localDb.allDocs
        .withArgs({ keys: ['feedback-doc:4', 'feedback-doc:5', 'telemetry-doc:3', 'telemetry-doc:4'] })
        .resolves({ rows: [
          { id: 'feedback-doc:4', value: { rev: 1 } },
          { id: 'feedback-doc:5', value: { rev: 1 } },
          { id: 'telemetry-doc:3', value: { rev: 1 } },
          { id: 'telemetry-doc:4', value: { rev: 1 } },
        ] });

      const changes = [
        {
          last_seq: 200,
          results: [
            { id: 'feedback-doc:1', seq: 100 },
            { id: 'feedback-doc:2', seq: 102 },
            { id: 'read:report:1', seq: 105 },
            { id: 'read:report:2', seq: 120 },
            { id: 'telemetry-1', seq: 120 },
            { id: 'telemetry-2', seq: 123, deleted: true },
            { id: 'feedback-doc:3', seq: 150, deleted: true },
            { id: 'whatever' },
          ]
        },
        {
          last_seq: 300,
          results: [
            { id: 'feedback-doc:4', seq: 201 },
            { id: 'read:report:3', seq: 206 },
            { id: 'read:report:4', seq: 210, deleted: true },
            { id: 'read:report:5', seq: 212, deleted: true },
            { id: 'feedback-doc:5', seq: 216 },
            { id: 'telemetry-doc:3', seq: 218 },
            { id: 'telemetry-doc:4', seq: 223 },
            { id: 'read:report:3', seq: 226 },
            { id: 'feedback-doc:6', seq: 231 },
            { id: 'feedback-doc:7', seq: 263 },
            { id: 'telemetry-doc:5', seq: 265 },
            { id: 'something', seq: 298 },
          ]
        }
      ];

      localDb.changes
        .onCall(0).resolves(changes[0])
        .onCall(1).resolves(changes[1]);

      localDb.bulkDocs.resolves([]);

      return purger.purgeMeta(localDb).then(() => {
        chai.expect(localDb.put.callCount).to.equal(2);
        chai.expect(localDb.put.args[0]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 200 }]);
        chai.expect(localDb.put.args[1]).to.deep.equal([{ _id: '_local/purgelog', synced_seq: end, purged_seq: 223 }]);

        chai.expect(localDb.changes.callCount).to.equal(2);
        chai.expect(localDb.changes.args[0]).to.deep.equal([{ since: 100, limit: 100 }]);
        chai.expect(localDb.changes.args[1]).to.deep.equal([{ since: 200, limit: 100 }]);

        chai.expect(localDb.allDocs.callCount).to.equal(2);
        chai.expect(localDb.allDocs.args[0]).to.deep.equal([{
          keys: ['feedback-doc:1', 'feedback-doc:2', 'telemetry-1']
        }]);
        chai.expect(localDb.allDocs.args[1]).to.deep.equal([{
          keys: ['feedback-doc:4', 'feedback-doc:5', 'telemetry-doc:3', 'telemetry-doc:4']
        }]);

        chai.expect(localDb.bulkDocs.callCount).to.equal(2);
        chai.expect(localDb.bulkDocs.args[0]).to.deep.equal([[
          { _id: 'feedback-doc:1', _rev: 1, _deleted: true, purged: true },
          { _id: 'feedback-doc:2', _rev: 1, _deleted: true, purged: true },
          { _id: 'telemetry-1', _rev: 1, _deleted: true, purged: true },
        ]]);
        chai.expect(localDb.bulkDocs.args[1]).to.deep.equal([[
          { _id: 'feedback-doc:4', _rev: 1, _deleted: true, purged: true },
          { _id: 'feedback-doc:5', _rev: 1, _deleted: true, purged: true },
          { _id: 'telemetry-doc:3', _rev: 1, _deleted: true, purged: true },
          { _id: 'telemetry-doc:4', _rev: 1, _deleted: true, purged: true },
        ]]);
      });
    });
  });
});
