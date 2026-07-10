const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const db = require('../../../../src/db');

const expect = chai.expect;

describe('bulk-operations sentinel processor', () => {
  let service;

  beforeEach(() => {
    service = rewire('../../../../src/lib/bulk-operations');
  });

  afterEach(() => sinon.restore());

  describe('processAction', () => {
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
      sinon.stub(db.sentinel, 'get').resolves(action);
      const put = sinon.stub(db.sentinel, 'put').resolves();
      sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from(JSON.stringify(operations)));
      const log = { _id: action.bulk_operation_id, actions: {} };
      sinon.stub(db.medicLogs, 'get').resolves(log);
      sinon.stub(db.medicLogs, 'put').resolves();
      return { put, log };
    };

    it('fetches the action, runs the handler in batches, records the log, and deletes the action', () => {
      const action = buildAction();
      const { put, log } = stubDb(action, [ { id: 'a' }, { id: 'b' } ]);
      const handler = sinon.stub().resolves([]);
      service.__set__('HANDLERS', { 'set-contact': handler });

      return service.processAction(actionId).then(() => {
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
    });

    it('records failed operations on the log', () => {
      const action = buildAction();
      const { log } = stubDb(action, [ { id: 'a' }, { id: 'b' } ]);
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().resolves([ { id: 'b' } ]) });

      return service.processAction(actionId).then(() => {
        const entry = log.actions[actionId];
        expect(entry.status).to.equal('failed');
        expect(entry.total_changes_count).to.equal(1);
        expect(entry.failed_operations.map(op => op.id)).to.deep.equal([ 'b' ]);
      });
    });

    it('throws when there is no handler for the action', () => {
      stubDb(buildAction({ action: 'archive' }), []);
      service.__set__('HANDLERS', {});

      return service
        .processAction(actionId)
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => expect(err.message).to.contain('no handler'));
    });

    it('is a no-op when the action doc is already gone', () => {
      sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
      const medicGet = sinon.stub(db.medicLogs, 'get');

      return service.processAction(actionId).then(() => {
        expect(medicGet.called).to.equal(false);
      });
    });

    it('skips recording when the log doc is missing, without crashing', () => {
      const action = buildAction();
      sinon.stub(db.sentinel, 'get').resolves(action);
      const put = sinon.stub(db.sentinel, 'put').resolves();
      sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from(JSON.stringify([ { id: 'a' }, { id: 'b' } ])));
      sinon.stub(db.medicLogs, 'get').rejects({ status: 404 });
      const logPut = sinon.stub(db.medicLogs, 'put').resolves();
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().resolves([]) });

      return service.processAction(actionId).then(() => {
        expect(logPut.called).to.equal(false);
        // the action is still removed
        expect(put.args.some(callArgs => callArgs[0]._deleted === true)).to.equal(true);
      });
    });

    it('resolves safely when there are no operations to process', () => {
      const action = buildAction({ total: 0 });
      const { put } = stubDb(action, []);
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().resolves([]) });

      return service.processAction(actionId).then(() => {
        expect(put.args.some(callArgs => callArgs[0]._deleted === true)).to.equal(true);
      });
    });
  });

  describe('listen', () => {
    it('registers the feed before loading the queue, enqueues ids, dedupes, and ignores irrelevant changes', () => {
      const processStub = sinon.stub();
      processStub.onFirstCall().rejects(new Error('processing error')); // exercises the queue error handler
      processStub.resolves();
      service.__set__('processAction', processStub);

      let onChange;
      const changes = sinon.stub(db.sentinel, 'changes').returns({
        on(event, cb) {
          if (event === 'change') {
            onChange = cb;
          }
          return this;
        },
      });
      const allDocs = sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [ { id: 'bulk-operation-action:op:1' } ] });

      return service
        .listen()
        .then(() => {
          expect(changes.calledBefore(allDocs)).to.equal(true); // feed registered before the initial queue
          onChange({ id: 'bulk-operation-action:op:2' });
          onChange({ id: 'bulk-operation-action:op:2' }); // already queued -> deduped
          onChange({ id: 'bulk-operation-action:op:3', deleted: true }); // ignored: deleted
          onChange({ id: 'not-an-action' }); // ignored: wrong prefix
          return new Promise(resolve => setTimeout(resolve, 20));
        })
        .then(() => {
          expect(processStub.args.map(a => a[0])).to.deep.equal([
            'bulk-operation-action:op:1',
            'bulk-operation-action:op:2',
          ]);
        });
    });
  });
});
