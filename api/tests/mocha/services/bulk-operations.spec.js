const chai = require('chai');
const sinon = require('sinon');

const db = require('../../../src/db');
const service = require('../../../src/services/bulk-operations');

describe('Bulk operations service', () => {
  afterEach(() => sinon.restore());

  describe('getLog', () => {
    it('returns the log document without the couch _rev', () => {
      const doc = {
        _id: 'bulk-operation:abc',
        _rev: '1-xyz',
        start_date: 'date',
        actions: { 'bulk-operation-action:abc:1': { status: 'queued' } },
      };
      sinon.stub(db.medicLogs, 'get').resolves(doc);

      return service.getLog('bulk-operation:abc').then((log) => {
        chai.expect(db.medicLogs.get.calledOnceWithExactly('bulk-operation:abc')).to.equal(true);
        chai.expect(log).to.deep.equal({
          _id: 'bulk-operation:abc',
          start_date: 'date',
          actions: { 'bulk-operation-action:abc:1': { status: 'queued' } },
        });
        chai.expect(log._rev).to.equal(undefined);
      });
    });

    it('returns null when the operation does not exist', () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 404 });

      return service.getLog('bulk-operation:missing').then((log) => {
        chai.expect(log).to.equal(null);
      });
    });

    it('does not query the database for an id that is not a bulk operation', () => {
      const get = sinon.stub(db.medicLogs, 'get');

      return Promise
        .all([
          service.getLog(undefined),
          service.getLog(''),
          service.getLog('upgrade_log:something'),
          service.getLog('some-other-doc'),
        ])
        .then((results) => {
          chai.expect(results).to.deep.equal([null, null, null, null]);
          chai.expect(get.called).to.equal(false);
        });
    });

    it('rethrows errors that are not a 404', () => {
      sinon.stub(db.medicLogs, 'get').rejects({ status: 500 });

      return service
        .getLog('bulk-operation:boom')
        .then(() => chai.expect.fail('should have thrown'))
        .catch((err) => chai.expect(err.status).to.equal(500));
    });
  });

  describe('queue', () => {
    const actionOperations = [
      { action: 'archive', operations: [{ id: 'person' }, { id: 'report' }] },
      { action: 'set-contact', operations: [{ id: 'place', current_contact_id: 'person' }] },
      { action: 'delete-user', operations: [{ id: 'org.couchdb.user:chw' }] },
    ];

    it('writes the log to medic-logs and the actions to medic-sentinel, and returns the operation id', () => {
      const put = sinon.stub(db.medicLogs, 'put').resolves();
      const bulkDocs = sinon.stub(db.sentinel, 'bulkDocs').resolves();

      return service.queue(actionOperations).then((operationId) => {
        chai.expect(operationId.startsWith('bulk-operation:')).to.equal(true);

        chai.expect(put.calledOnce).to.equal(true);
        const log = put.args[0][0];
        chai.expect(log._id).to.equal(operationId);
        chai.expect(Object.keys(log.actions)).to.have.length(3);

        chai.expect(bulkDocs.calledOnce).to.equal(true);
        const actions = bulkDocs.args[0][0];
        chai.expect(actions).to.have.length(3);
        chai.expect(actions.map(action => action.action)).to.deep.equal(['archive', 'set-contact', 'delete-user']);
        chai.expect(actions[0].bulk_operation_id).to.equal(operationId);

        // the log must exist before the listener can pick up an action
        chai.expect(put.calledBefore(bulkDocs)).to.equal(true);
      });
    });

    it('stores each action\'s params in a base64 json attachment and records the log action detail', () => {
      const put = sinon.stub(db.medicLogs, 'put').resolves();
      const bulkDocs = sinon.stub(db.sentinel, 'bulkDocs').resolves();

      return service.queue(actionOperations).then(() => {
        const log = put.args[0][0];
        const actions = bulkDocs.args[0][0];

        // per-item params live in a base64 json attachment
        const attachment = actions[0]._attachments.operations;
        chai.expect(attachment.content_type).to.equal('application/json');
        chai.expect(JSON.parse(Buffer.from(attachment.data, 'base64').toString()))
          .to.deep.equal(actionOperations[0].operations);
        chai.expect(actions[0].cursor).to.equal(0);
        chai.expect(actions[0].total).to.equal(2);

        // the log action entry cross-links to the action doc and starts queued
        const logAction = log.actions[actions[0]._id];
        chai.expect(logAction.status).to.equal('queued');
        chai.expect(logAction.action).to.equal('archive');
        chai.expect(logAction.total_changes_count).to.equal(2);
        chai.expect(logAction.updated_date).to.equal(log.start_date);
      });
    });

    it('generates a distinct operation id on each call', () => {
      sinon.stub(db.medicLogs, 'put').resolves();
      sinon.stub(db.sentinel, 'bulkDocs').resolves();

      return Promise
        .all([ service.queue(actionOperations), service.queue(actionOperations) ])
        .then(([ first, second ]) => chai.expect(first).to.not.equal(second));
    });

    it('skips action groups that have no operations', () => {
      sinon.stub(db.medicLogs, 'put').resolves();
      const bulkDocs = sinon.stub(db.sentinel, 'bulkDocs').resolves();
      const groups = [
        { action: 'archive', operations: [{ id: 'person' }] },
        { action: 'set-contact', operations: [] },
        { action: 'delete-user', operations: [{ id: 'org.couchdb.user:chw' }] },
      ];

      return service.queue(groups).then(() => {
        const actions = bulkDocs.args[0][0];
        chai.expect(actions.map(action => action.action)).to.deep.equal(['archive', 'delete-user']);
      });
    });
  });
});
