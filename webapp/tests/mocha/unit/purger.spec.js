const sinon = require('sinon');
const chai = require('chai');

const purger = require('../../../src/js/bootstrapper/purger');

let localDb;

describe('Purger', () => {

  beforeEach(() => {
    window = {
      location: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '5988',
        pathname: '/',
        href: 'http://localhost:5988/',
      },
    };

    localDb = {
      get: sinon.stub(),
      allDocs: sinon.stub(),
      bulkDocs: sinon.stub(),
      put: sinon.stub(),
    };
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

    it('does nothing if no purgelog doc exists', () => {
      localDb.get.withArgs('_local/purgelog').rejects({ status: 404 });
      return purger.purgeMeta(localDb).then(() => {
        chai.expect(localDb.changes.callCount).to.equal(0);
      });
    });

    it('does nothing purge log document exists, but lacks a synced seq', () => {
      localDb.get.withArgs('_local/purgelog').resolves({ _id: '_local/purgelog' });
      return purger.purgeMeta(localDb).then(() => {
        chai.expect(localDb.changes.callCount).to.equal(0);
      });
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
