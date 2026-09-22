const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');
const logger = require('@medic/logger');

const db = require('../../../../src/db');

const expect = chai.expect;

const LOG_ID = 'bulk-operation:op';
const ACTION_ID = 'bulk-operation-action:op:1';

class ValidationError extends Error {}

describe('bulk-operations sentinel scheduler', () => {
  let service;
  let planners;

  beforeEach(() => {
    service = rewire('../../../../src/lib/bulk-operations');
    planners = {
      validate: sinon.stub().resolves(),
      plan: sinon.stub().resolves({ summary: {}, actions: [] }),
      ValidationError,
    };
    service.__set__('planners', planners);

    sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [] });
    sinon.stub(db.sentinel, 'bulkDocs').resolves([]);
    sinon.stub(db.sentinel, 'get');
    sinon.stub(db.sentinel, 'put').resolves();
    sinon.stub(db.sentinel, 'getAttachment');
    sinon.stub(db.medicLogs, 'get');
    sinon.stub(db.medicLogs, 'put').resolves();
    sinon.stub(db.medicLogs, 'query').resolves({ rows: [] });
  });

  afterEach(() => sinon.restore());

  const buildAction = (overrides = {}) => ({
    _id: ACTION_ID,
    _rev: '1-a',
    bulk_operation_id: LOG_ID,
    action: 'set-contact',
    cursor: 0,
    total: 2,
    ...overrides,
  });

  const buildLog = (overrides = {}) => ({
    _id: LOG_ID,
    type: 'delete-contact',
    params: { contact_id: 'target' },
    status: 'running',
    actions: {},
    ...overrides,
  });

  describe('runAction', () => {
    const stubOperations = (action, operations) => {
      db.sentinel.get.resolves(action);
      db.sentinel.getAttachment.resolves(Buffer.from(JSON.stringify(operations)));
    };

    it('runs the handler in batches, records the result on the log, and deletes the action', async () => {
      const action = buildAction();
      stubOperations(action, [ { id: 'a' }, { id: 'b' } ]);
      const handler = sinon.stub().resolves([]);
      service.__set__('HANDLERS', { 'set-contact': handler });

      await service.__get__('runAction')(action, buildLog());

      expect(handler.calledOnce).to.equal(true);
      expect(handler.args[0][0].map(op => op.id)).to.deep.equal([ 'a', 'b' ]);

      const [ log ] = db.medicLogs.put.args[0];
      expect(log.actions[ACTION_ID]).to.deep.include({ action: 'set-contact', total_changes_count: 2 });
      // the operation's own status is not decided here
      expect(log.status).to.equal('running');

      expect(db.sentinel.bulkDocs.args[0][0]).to.deep.equal([ { _id: ACTION_ID, _rev: '1-a', _deleted: true } ]);
    });

    it('records the operations that failed', async () => {
      const action = buildAction();
      stubOperations(action, [ { id: 'a' } ]);
      db.sentinel.get.onSecondCall().resolves({ ...action, failed_operations: [ { id: 'a' } ] });
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().resolves([ { id: 'a' } ]) });

      await service.__get__('runAction')(action, buildLog());

      expect(db.medicLogs.put.args[0][0].actions[ACTION_ID].failed_operations).to.deep.equal([ { id: 'a' } ]);
    });

    it('treats an unexpected handler error as a failed batch and still records and deletes', async () => {
      const action = buildAction({ total: 1 });
      stubOperations(action, [ { id: 'a' } ]);
      sinon.stub(logger, 'error');
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().rejects(new Error('boom')) });

      await service.__get__('runAction')(action, buildLog());

      expect(db.sentinel.put.args[0][0].failed_operations).to.deep.equal([ { id: 'a' } ]);
      expect(db.medicLogs.put.called).to.equal(true);
      expect(db.sentinel.bulkDocs.called).to.equal(true);
    });

    it('records the action and still deletes it when there is no handler', async () => {
      const action = buildAction({ action: 'nonsense' });
      service.__set__('HANDLERS', {});

      await expect(service.__get__('runAction')(action, buildLog())).to.be.rejectedWith('no handler');

      expect(db.medicLogs.put.called).to.equal(true);
      expect(db.sentinel.bulkDocs.called).to.equal(true);
    });
  });

  describe('planOperation', () => {
    it('writes the action docs before the log says running', async () => {
      planners.plan.resolves({
        summary: { delete: { contacts: 1, reports: 0 } },
        actions: [
          { action: 'set-contact', operations: [ { id: 'place' } ] },
          { action: 'delete', operations: [ { id: 'target' } ] },
        ],
      });

      await service.__get__('planOperation')(buildLog({ status: 'queued' }));

      expect(db.sentinel.bulkDocs.calledBefore(db.medicLogs.put)).to.equal(true);
      const written = db.sentinel.bulkDocs.args[0][0];
      expect(written.map(doc => doc.action)).to.deep.equal([ 'set-contact', 'delete' ]);
      // every action doc is prefixed with its operation's uuid, so they can be found together
      expect(written.every(doc => doc._id.startsWith('bulk-operation-action:op:'))).to.equal(true);
      expect(written[0].cursor).to.equal(0);
      expect(written[0].total).to.equal(1);
      expect(JSON.parse(Buffer.from(written[0]._attachments.operations.data, 'base64').toString()))
        .to.deep.equal([ { id: 'place' } ]);

      const [ log ] = db.medicLogs.put.args[0];
      expect(log.status).to.equal('running');
      expect(log.summary).to.deep.equal({ delete: { contacts: 1, reports: 0 } });
      expect(Object.values(log.actions).map(a => a.action)).to.deep.equal([ 'set-contact', 'delete' ]);
    });

    it('skips action groups that have no operations', async () => {
      planners.plan.resolves({
        summary: {},
        actions: [
          { action: 'set-contact', operations: [] },
          { action: 'delete', operations: [ { id: 'target' } ] },
        ],
      });

      await service.__get__('planOperation')(buildLog({ status: 'queued' }));

      expect(db.sentinel.bulkDocs.args[0][0].map(doc => doc.action)).to.deep.equal([ 'delete' ]);
    });

    it('fails the operation when it is no longer valid, without writing any actions', async () => {
      sinon.stub(logger, 'warn');
      planners.validate.rejects(new ValidationError('contact is gone'));

      await service.__get__('planOperation')(buildLog({ status: 'queued' }));

      expect(db.sentinel.bulkDocs.called).to.equal(false);
      expect(planners.plan.called).to.equal(false);
      const [ log ] = db.medicLogs.put.args[0];
      expect(log.status).to.equal('failed');
      expect(log.error).to.deep.equal({ message: 'contact is gone' });
    });

    it('lets an unexpected validation failure propagate rather than failing the operation', async () => {
      planners.validate.rejects(new Error('couch is down'));

      await expect(service.__get__('planOperation')(buildLog({ status: 'queued' })))
        .to.be.rejectedWith('couch is down');

      expect(db.medicLogs.put.called).to.equal(false);
    });

    it('throws when an action doc could not be written, leaving the log queued', async () => {
      planners.plan.resolves({ summary: {}, actions: [ { action: 'delete', operations: [ { id: 'a' } ] } ] });
      db.sentinel.bulkDocs.resolves([ { id: 'x', error: 'conflict' } ]);

      await expect(service.__get__('planOperation')(buildLog({ status: 'queued' })))
        .to.be.rejectedWith('could not write action docs');

      expect(db.medicLogs.put.called).to.equal(false);
    });
  });

  describe('finishOperation', () => {
    it('completes an operation whose actions all succeeded', async () => {
      await service.__get__('finishOperation')(buildLog({ actions: { [ACTION_ID]: { action: 'delete' } } }));

      expect(db.medicLogs.put.args[0][0].status).to.equal('completed');
    });

    it('fails an operation that left failures behind', async () => {
      const actions = { [ACTION_ID]: { action: 'delete', failed_operations: [ { id: 'a' } ] } };

      await service.__get__('finishOperation')(buildLog({ actions }));

      expect(db.medicLogs.put.args[0][0].status).to.equal('failed');
    });
  });

  describe('pullNext', () => {
    const pullNext = () => service.__get__('pullNext')();

    const stubOldestAction = (action) => db.sentinel.allDocs
      .withArgs(sinon.match({ startkey: 'bulk-operation-action:' }))
      .resolves({ rows: action ? [ { id: action._id, doc: action } ] : [] });

    it('runs the oldest action when its operation is running', async () => {
      const action = buildAction();
      stubOldestAction(action);
      db.medicLogs.get.resolves(buildLog());
      db.sentinel.get.resolves(action);
      db.sentinel.getAttachment.resolves(Buffer.from('[]'));
      service.__set__('HANDLERS', { 'set-contact': sinon.stub().resolves([]) });

      await (await pullNext())();

      expect(db.medicLogs.put.called).to.equal(true);
    });

    it('discards the action docs and plans again when the plan was interrupted', async () => {
      sinon.stub(logger, 'warn');
      const action = buildAction();
      stubOldestAction(action);
      db.medicLogs.get.resolves(buildLog({ status: 'queued' }));
      db.sentinel.allDocs.withArgs(sinon.match({ startkey: 'bulk-operation-action:op:' }))
        .resolves({ rows: [ { id: ACTION_ID, value: { rev: '1-a' } } ] });

      await (await pullNext())();

      expect(db.sentinel.bulkDocs.args[0][0]).to.deep.equal([ { _id: ACTION_ID, _rev: '1-a', _deleted: true } ]);
      expect(planners.plan.called).to.equal(true);
    });

    it('discards actions left behind by an interrupted cleanup', async () => {
      sinon.stub(logger, 'warn');
      stubOldestAction(buildAction());
      db.medicLogs.get.resolves(buildLog({ status: 'completed' }));
      db.sentinel.allDocs.withArgs(sinon.match({ startkey: 'bulk-operation-action:op:' }))
        .resolves({ rows: [ { id: ACTION_ID, value: { rev: '1-a' } } ] });

      await (await pullNext())();

      expect(db.sentinel.bulkDocs.args[0][0][0]._deleted).to.equal(true);
      expect(planners.plan.called).to.equal(false);
    });

    it('discards actions whose log has gone entirely', async () => {
      sinon.stub(logger, 'warn');
      stubOldestAction(buildAction());
      db.medicLogs.get.rejects({ status: 404 });
      db.sentinel.allDocs.withArgs(sinon.match({ startkey: 'bulk-operation-action:op:' }))
        .resolves({ rows: [ { id: ACTION_ID, value: { rev: '1-a' } } ] });

      await (await pullNext())();

      expect(db.sentinel.bulkDocs.args[0][0][0]._deleted).to.equal(true);
    });

    it('finishes a running operation once no actions are left', async () => {
      stubOldestAction(null);
      db.medicLogs.query.withArgs(sinon.match.any, sinon.match({ key: 'running' }))
        .resolves({ rows: [ { doc: buildLog() } ] });

      await (await pullNext())();

      expect(db.medicLogs.put.args[0][0].status).to.equal('completed');
    });

    it('plans the oldest queued operation when nothing else is outstanding', async () => {
      stubOldestAction(null);
      db.medicLogs.query.withArgs(sinon.match.any, sinon.match({ key: 'queued' }))
        .resolves({ rows: [ { doc: buildLog({ status: 'queued' }) } ] });

      await (await pullNext())();

      expect(planners.plan.called).to.equal(true);
    });

    it('returns nothing when there is no work', async () => {
      stubOldestAction(null);

      expect(await pullNext()).to.equal(null);
    });
  });

  describe('listen', () => {
    it('registers the feed before the first pass, and wakes on a log change', async () => {
      const on = sinon.stub().returnsThis();
      const changes = sinon.stub().returns({ on });
      db.medicLogs.changes = changes;

      await service.listen();

      expect(changes.calledOnce).to.equal(true);
      expect(changes.args[0][0]).to.deep.equal({ live: true, since: 'now' });

      const wake = sinon.stub();
      service.__set__('wake', wake);
      const onChange = on.args.find(([ event ]) => event === 'change')[1];
      onChange({ id: 'bulk-operation:other' });
      onChange({ id: 'something-else' });

      expect(wake.callCount).to.equal(1);
    });

    it('logs a changes-feed error and re-registers the feed after RETRY_TIMEOUT', async () => {
      const errorLog = sinon.stub(logger, 'error');
      const setTimeoutStub = sinon.stub();
      service.__set__('setTimeout', setTimeoutStub);
      const on = sinon.stub().returnsThis();
      const changes = sinon.stub().returns({ on });
      db.medicLogs.changes = changes;

      await service.listen();
      on.args.find(([ event ]) => event === 'error')[1](new Error('feed boom'));

      expect(errorLog.calledOnce).to.equal(true);
      expect(errorLog.args[0][0]).to.contain('changes feed error');
      expect(changes.callCount).to.equal(1);
      expect(setTimeoutStub.args[0][1]).to.equal(60000);

      // Firing the scheduled callback re-registers the feed.
      setTimeoutStub.args[0][0]();
      expect(changes.callCount).to.equal(2);
    });
  });
});
