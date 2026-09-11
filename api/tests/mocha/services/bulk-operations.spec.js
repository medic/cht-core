const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../src/db');
const service = require('../../../src/services/bulk-operations');

describe('Bulk operations service', () => {
  afterEach(() => sinon.restore());

  describe('getLog', () => {
    it('returns the log document without the couch _rev', async () => {
      const doc = {
        _id: 'bulk-operation:abc',
        _rev: '1-xyz',
        start_date: 'date',
        actions: { 'bulk-operation-action:abc:1': { status: 'queued' } },
      };
      sinon.stub(db.medicLogs, 'get').resolves(doc);

      const log = await service.getLog('bulk-operation:abc');

      expect(db.medicLogs.get.calledOnceWithExactly('bulk-operation:abc')).to.equal(true);
      expect(log).to.deep.equal({
        _id: 'bulk-operation:abc',
        start_date: 'date',
        actions: { 'bulk-operation-action:abc:1': { status: 'queued' } },
      });
      expect(log._rev).to.be.undefined;
    });

    it('returns null when the operation does not exist', async () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 404 });

      const log = await service.getLog('bulk-operation:missing');

      expect(log).to.be.null;
    });

    it('does not query the database for an id that is not a bulk operation', async () => {
      const get = sinon.stub(db.medicLogs, 'get');

      const results = await Promise.all([
        service.getLog(undefined),
        service.getLog(''),
        service.getLog('upgrade_log:something'),
        service.getLog('some-other-doc'),
      ]);

      expect(results).to.deep.equal([null, null, null, null]);
      expect(get.called).to.equal(false);
    });

    it('rethrows errors that are not a 404', async () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 500 });

      try {
        await service.getLog('bulk-operation:boom');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err.status).to.equal(500);
      }
    });
  });

  describe('queue', () => {
    const actionOperations = [
      { action: 'archive', operations: [{ id: 'person' }, { id: 'report' }] },
      { action: 'set-contact', operations: [{ id: 'place', current_contact_id: 'person' }] },
      { action: 'delete-user', operations: [{ id: 'org.couchdb.user:chw' }] },
    ];

    it('writes the log to medic-logs and the actions to medic-sentinel, and returns the operation id', async () => {
      const put = sinon.stub(db.medicLogs, 'put').resolves();
      const saveDocs = sinon.stub(db, 'saveDocs').resolves();

      const operationId = await service.queue(actionOperations);

      expect(operationId.startsWith('bulk-operation:')).to.equal(true);

      expect(put.calledOnce).to.equal(true);
      const log = put.args[0][0];
      expect(log._id).to.equal(operationId);
      expect(Object.keys(log.actions)).to.have.length(3);

      expect(saveDocs.calledOnce).to.equal(true);
      expect(saveDocs.args[0][0]).to.equal(db.sentinel);
      const actions = saveDocs.args[0][1];
      expect(actions).to.have.length(3);
      expect(actions.map(action => action.action)).to.deep.equal(['archive', 'set-contact', 'delete-user']);
      expect(actions[0].bulk_operation_id).to.equal(operationId);

      // the log must exist before the listener can pick up an action
      expect(put.calledBefore(saveDocs)).to.equal(true);
    });

    it('stores each action\'s params in a base64 json attachment and records the log action detail', async () => {
      const put = sinon.stub(db.medicLogs, 'put').resolves();
      const saveDocs = sinon.stub(db, 'saveDocs').resolves();

      await service.queue(actionOperations);

      const log = put.args[0][0];
      const actions = saveDocs.args[0][1];

      // per-item params live in a base64 json attachment
      const attachment = actions[0]._attachments.operations;
      expect(attachment.content_type).to.equal('application/json');
      expect(JSON.parse(Buffer.from(attachment.data, 'base64').toString()))
        .to.deep.equal(actionOperations[0].operations);
      expect(actions[0].cursor).to.equal(0);
      expect(actions[0].total).to.equal(2);

      // the log action entry cross-links to the action doc and starts queued
      const logAction = log.actions[actions[0]._id];
      expect(logAction.status).to.equal('queued');
      expect(logAction.action).to.equal('archive');
      expect(logAction.total_changes_count).to.equal(2);
      expect(logAction.updated_date).to.equal(log.start_date);
    });

    it('generates a distinct operation id on each call', async () => {
      sinon.stub(db.medicLogs, 'put').resolves();
      sinon.stub(db, 'saveDocs').resolves();

      const [ first, second ] = await Promise.all([ service.queue(actionOperations), service.queue(actionOperations) ]);

      expect(first).to.not.equal(second);
    });

    it('skips action groups that have no operations', async () => {
      sinon.stub(db.medicLogs, 'put').resolves();
      const saveDocs = sinon.stub(db, 'saveDocs').resolves();
      const groups = [
        { action: 'archive', operations: [{ id: 'person' }] },
        { action: 'set-contact', operations: [] },
        { action: 'delete-user', operations: [{ id: 'org.couchdb.user:chw' }] },
      ];

      await service.queue(groups);

      const actions = saveDocs.args[0][1];
      expect(actions.map(action => action.action)).to.deep.equal(['archive', 'delete-user']);
    });
  });
});
