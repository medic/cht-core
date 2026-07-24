const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const logger = require('@medic/logger');

const db = require('../../../../src/db');

const expect = chai.expect;

describe('bulk-operations sentinel processor', () => {
  let service;

  beforeEach(() => {
    service = rewire('../../../../src/lib/bulk-operations');
  });

  afterEach(() => sinon.restore());

  describe('processAction', () => {
    let processAction;
    beforeEach(() => {
      processAction = service.__get__('processAction');
      sinon.stub(db.sentinel, 'get');
      sinon.stub(db.sentinel, 'put');
      sinon.stub(db.sentinel, 'getAttachment');
      sinon.stub(db.medicLogs, 'get');
      sinon.stub(db.medicLogs, 'put');
    });

    const actionId = 'bulk-operation-action:op:1';
    const buildAction = (overrides = {}) => ({
      _id: actionId,
      bulk_operation_id: 'bulk-operation:op',
      action: 'set-contact',
      cursor: 0,
      total: 2,
      ...overrides,
    });

    const stubDb = (action, operations) => {
      db.sentinel.get.resolves(action);
      const put = db.sentinel.put.resolves();
      db.sentinel.getAttachment.resolves(Buffer.from(JSON.stringify(operations)));
      const log = { _id: action.bulk_operation_id, actions: {} };
      db.medicLogs.get.resolves(log);
      db.medicLogs.put.resolves();
      return { put, log };
    };

    it('fetches the action, runs the handler in batches, records the log, and deletes the action', async () => {
      const action = buildAction();
      const { put, log } = stubDb(action, [ { id: 'a' }, { id: 'b' } ]);
      const handler = sinon.stub().resolves([]);
      service.__set__('HANDLERS', { 'set-contact': handler });

      await processAction(actionId);

      expect(db.sentinel.get.firstCall.args[0]).to.equal(actionId);
      expect(handler.calledOnce).to.equal(true);
      expect(handler.args[0][0].map(op => op.id)).to.deep.equal([ 'a', 'b' ]);
      expect(handler.args[0][1]).to.equal(actionId); // the action id is passed for logging

      const entry = log.actions[actionId];
      expect(entry.status).to.equal('completed');
      expect(entry.total_changes_count).to.equal(2);
      expect(entry.failed_operations).to.be.undefined;

      expect(put.args.some(callArgs => callArgs[0]._deleted === true)).to.equal(true);
    });

    it('records failed operations on the log', async () => {
      const action = buildAction();
      const { log } = stubDb(action, [ { id: 'a' }, { id: 'b' } ]);
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().resolves([ { id: 'b' } ]) });

      await processAction(actionId);

      const entry = log.actions[actionId];
      expect(entry.status).to.equal('failed');
      expect(entry.total_changes_count).to.equal(2);
      expect(entry.failed_operations.map(op => op.id)).to.deep.equal([ 'b' ]);
    });

    it('records the action failed and still deletes it when there is no handler', async () => {
      const { put, log } = stubDb(buildAction({ action: 'not-found' }), []);

      await expect(processAction(actionId)).to.be
        .rejectedWith(Error, `bulk-operations: no handler for action "not-found"`);

      expect(log.actions[actionId].status).to.equal('failed');
      expect(put.args.some(callArgs => callArgs[0]._deleted === true)).to.equal(true);
    });

    it('treats an unexpected handler error as a failed batch and still records and deletes', async () => {
      const { put, log } = stubDb(buildAction(), [ { id: 'a' }, { id: 'b' } ]);
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().rejects(new Error('boom')) });

      await processAction(actionId);

      const entry = log.actions[actionId];
      expect(entry.status).to.equal('failed');
      expect(entry.failed_operations.map(op => op.id)).to.deep.equal([ 'a', 'b' ]);
      expect(put.args.some(callArgs => callArgs[0]._deleted === true)).to.equal(true);
    });

    it('is a no-op when the action doc is already gone', async () => {
      db.sentinel.get.rejects({ status: 404 });

      await processAction(actionId);

      expect(db.medicLogs.get.called).to.equal(false);
    });

    it('skips recording when the log doc is missing, without crashing', async () => {
      const action = buildAction();
      db.sentinel.get.resolves(action);
      const put = db.sentinel.put.resolves();
      db.sentinel.getAttachment.resolves(Buffer.from(JSON.stringify([ { id: 'a' }, { id: 'b' } ])));
      db.medicLogs.get.rejects({ status: 404 });
      const logPut = db.medicLogs.put.resolves();
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().resolves([]) });

      await processAction(actionId);

      expect(logPut.called).to.equal(false);
      // the action is still removed
      expect(put.args.some(callArgs => callArgs[0]._deleted === true)).to.equal(true);
    });

    it('resolves safely when there are no operations to process', async () => {
      const action = buildAction({ total: 0 });
      const { put } = stubDb(action, []);
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().resolves([]) });

      await processAction(actionId);

      expect(put.args.some(callArgs => callArgs[0]._deleted === true)).to.equal(true);
    });
  });

  describe('listen', () => {
    beforeEach(() => {
      sinon.stub(db.sentinel, 'changes');
      sinon.stub(db.sentinel, 'allDocs');
    });

    it('registers the feed before loading the queue, enqueues ids, dedupes, ignores irrelevant changes', async () => {
      const processStub = sinon.stub();
      processStub.onFirstCall().rejects(new Error('processing error')); // exercises the queue error handler
      processStub.resolves();
      service.__set__('processAction', processStub);

      let onChange;
      const changes = db.sentinel.changes.returns({
        on(event, cb) {
          if (event === 'change') {
            onChange = cb;
          }
          return this;
        },
      });
      const allDocs = db.sentinel.allDocs.resolves({ rows: [ { id: 'bulk-operation-action:op:1' } ] });

      await service.listen();

      expect(changes.calledBefore(allDocs)).to.equal(true); // feed registered before the initial queue
      onChange({ id: 'bulk-operation-action:op:2' });
      onChange({ id: 'bulk-operation-action:op:2' }); // already queued -> deduped
      onChange({ id: 'bulk-operation-action:op:3', deleted: true }); // ignored: deleted
      onChange({ id: 'not-an-action' }); // ignored: wrong prefix
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(processStub.args.map(a => a[0])).to.deep.equal([
        'bulk-operation-action:op:1',
        'bulk-operation-action:op:2',
      ]);
    });

    it('logs and swallows a failure driven through the queue', async () => {
      const errorLog = sinon.stub(logger, 'error');
      sinon.stub(db.sentinel, 'get').rejects({ status: 500, message: 'couch down' });
      db.sentinel.changes.returns({
        on() {
          return this;
        },
      });
      db.sentinel.allDocs.resolves({ rows: [ { id: 'bulk-operation-action:op:1' } ] });

      await service.listen();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(errorLog.args).to.deep.equal([[
        'bulk-operations: error processing action bulk-operation-action:op:1: %o',
        { message: 'couch down', status: 500 }
      ]]);
    });

    it('logs a changes-feed error and re-registers the feed after RETRY_TIMEOUT', async () => {
      const errorLog = sinon.stub(logger, 'error');
      const setTimeoutStub = sinon.stub();
      service.__set__('setTimeout', setTimeoutStub);

      let onError;
      const changes = db.sentinel.changes.returns({
        on(event, cb) {
          if (event === 'error') {
            onError = cb;
          }
          return this;
        },
      });
      db.sentinel.allDocs.resolves({ rows: [] });

      await service.listen();

      expect(changes.callCount).to.equal(1);

      onError(new Error('feed boom'));
      expect(errorLog.calledOnce).to.equal(true);
      expect(errorLog.args[0][0]).to.contain('changes feed error');

      expect(changes.callCount).to.equal(1);
      expect(setTimeoutStub.calledOnce).to.equal(true);
      expect(setTimeoutStub.args[0][1]).to.equal(60000);

      // Firing the scheduled callback re-registers the feed.
      setTimeoutStub.args[0][0]();
      expect(changes.callCount).to.equal(2);
    });
  });
});
