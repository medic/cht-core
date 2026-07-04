const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const db = require('../../../src/db');

const expect = chai.expect;

describe('bulk-operations sentinel processor', () => {
  let service;

  beforeEach(() => {
    service = rewire('../../../src/lib/bulk-operations');
  });

  afterEach(() => sinon.restore());

  const buildAction = (overrides = {}) => ({
    _id: 'bulk-operation-action:op:1',
    _rev: '1-a',
    bulk_operation_id: 'bulk-operation:op',
    action: 'set-contact',
    cursor: 0,
    total: 2,
    _attachments: { operations: { stub: true } },
    ...overrides,
  });

  const stubActionWrites = () => {
    sinon.stub(db.sentinel, 'get').resolves({ _rev: '2-b' });
    sinon.stub(db.sentinel, 'put').resolves({ rev: '3-c' });
    const log = { _id: 'bulk-operation:op', actions: {} };
    sinon.stub(db.medicLogs, 'get').resolves(log);
    sinon.stub(db.medicLogs, 'put').resolves();
    return log;
  };

  describe('processAction', () => {
    it('applies matching set-contact operations, advances the cursor, records the log and removes the action', () => {
      const action = buildAction();
      const operations = [
        { id: 'place-1', contact: { _id: 'new-1' }, current_contact_id: 'old-1' },
        { id: 'place-2', current_contact_id: 'old-2' }, // no `contact` means clear it
      ];
      sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from(JSON.stringify(operations)));
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { doc: { _id: 'place-1', contact: { _id: 'old-1' } } },
        { doc: { _id: 'place-2', contact: 'old-2' } },
      ] });
      const medicBulk = sinon.stub(db.medic, 'bulkDocs').resolves();
      const log = stubActionWrites();

      return service.processAction(action).then(() => {
        expect(medicBulk.calledOnce).to.equal(true);
        const updated = medicBulk.args[0][0];
        expect(updated.find(d => d._id === 'place-1').contact).to.deep.equal({ _id: 'new-1' });
        expect(updated.find(d => d._id === 'place-2').contact).to.equal(undefined);

        expect(action.cursor).to.equal(2);
        expect(db.sentinel.put.called).to.equal(true);

        const entry = log.actions['bulk-operation-action:op:1'];
        expect(entry.status).to.equal('completed');
        expect(entry.action).to.equal('set-contact');
        expect(entry.total_changes_count).to.equal(2);
        expect(entry.failed_operations).to.equal(undefined);

        expect(db.sentinel.put.args.some(callArgs => callArgs[0]._deleted === true)).to.equal(true);
      });
    });

    it('records operations that no longer match as failed', () => {
      const action = buildAction();
      const operations = [
        { id: 'place-1', contact: { _id: 'new-1' }, current_contact_id: 'old-1' },
        { id: 'gone', current_contact_id: 'old-2' },
      ];
      sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from(JSON.stringify(operations)));
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [
        { doc: { _id: 'place-1', contact: { _id: 'changed-since' } } }, // contact changed
        { key: 'gone', error: 'not_found' }, // doc gone
      ] });
      sinon.stub(db.medic, 'bulkDocs').resolves();
      const log = stubActionWrites();

      return service.processAction(action).then(() => {
        const entry = log.actions['bulk-operation-action:op:1'];
        expect(entry.status).to.equal('failed');
        expect(entry.total_changes_count).to.equal(0);
        expect(entry.failed_operations.map(op => op.id)).to.deep.equal(['place-1', 'gone']);
      });
    });

    it('deletes each linked user via the user-delete path for a delete-user action', () => {
      const deleteUserStub = sinon.stub().resolves();
      service.__set__('userManagement', { deleteUser: deleteUserStub });

      const action = buildAction({ action: 'delete-user' });
      const operations = [{ id: 'org.couchdb.user:alice' }, { id: 'org.couchdb.user:bob' }];
      sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from(JSON.stringify(operations)));
      const log = stubActionWrites();

      return service.processAction(action).then(() => {
        expect(deleteUserStub.args.map(a => a[0])).to.deep.equal(['alice', 'bob']);
        expect(log.actions['bulk-operation-action:op:1'].status).to.equal('completed');
      });
    });

    it('records a user that fails to delete as a failed operation', () => {
      const deleteUserStub = sinon.stub();
      deleteUserStub.withArgs('alice').resolves();
      deleteUserStub.withArgs('bob').rejects(new Error('boom'));
      service.__set__('userManagement', { deleteUser: deleteUserStub });

      const action = buildAction({ action: 'delete-user' });
      const operations = [{ id: 'org.couchdb.user:alice' }, { id: 'org.couchdb.user:bob' }];
      sinon.stub(db.sentinel, 'getAttachment').resolves(Buffer.from(JSON.stringify(operations)));
      const log = stubActionWrites();

      return service.processAction(action).then(() => {
        const entry = log.actions['bulk-operation-action:op:1'];
        expect(entry.status).to.equal('failed');
        expect(entry.failed_operations.map(op => op.id)).to.deep.equal(['org.couchdb.user:bob']);
      });
    });

    it('throws when there is no handler for the action', () => {
      const action = buildAction({ action: 'archive' });

      return service
        .processAction(action)
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => expect(err.message).to.contain('no handler'));
    });
  });

  describe('listen', () => {
    it('queues and processes action docs already waiting in medic-sentinel', () => {
      const processStub = sinon.stub().resolves();
      service.__set__('processAction', processStub);
      sinon.stub(db.sentinel, 'allDocs').resolves({ rows: [
        { doc: { _id: 'bulk-operation-action:op:1' } },
        { doc: { _id: 'bulk-operation-action:op:2' } },
      ] });
      const changes = sinon.stub(db.sentinel, 'changes').returns({ on() {
        return this;
      } });

      return service
        .listen()
        .then(() => new Promise(resolve => setTimeout(resolve, 20)))
        .then(() => {
          expect(changes.calledOnce).to.equal(true);
          expect(processStub.callCount).to.equal(2);
          expect(processStub.args.map(a => a[0]._id)).to.deep.equal([
            'bulk-operation-action:op:1',
            'bulk-operation-action:op:2',
          ]);
        });
    });
  });
});
