const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../src/db');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const bulkOperations = require('../../../src/services/bulk-operations');
const { NotFoundError, BadRequestError } = require('../../../src/errors');
const service = require('../../../src/services/delete-contact');

describe('Delete contact service', () => {
  let res;

  beforeEach(() => {
    sinon.stub(auth, 'assertPermissions').resolves();
    sinon.stub(serverUtils, 'error');
    res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
  });

  afterEach(() => sinon.restore());

  // The delete logic is only reachable through the shared handler, so it is tested through it: each
  // test builds the handler with a `get` (the type-specific fetch the controllers pass in) and stubs
  // the db layer the gather runs against.
  const handlerFor = (get) => service.handleDelete({ get, type: 'Person' });

  describe('handleDelete', () => {
    it('gathers the hierarchy, queues the actions in order, and responds 202 with the summary', async () => {
      const get = sinon.stub().resolves({ _id: 'target' });
      sinon.stub(db.medic, 'query').callsFake((view) => {
        if (view === 'medic/contacts_by_depth') {
          return Promise.resolve({ rows: [
            { id: 'target', value: { shortcode: 'PID-1' } },
            { id: 'child', value: { shortcode: null } },
          ] });
        }
        if (view === 'medic-client/reports_by_subject') {
          return Promise.resolve({ rows: [ { id: 'report-1' }, { id: 'report-1' }, { id: 'report-2' } ] });
        }
        if (view === 'medic/contacts_by_primary_contact') {
          return Promise.resolve({ rows: [
            { id: 'parent-place', key: 'target' }, // parent whose primary is the target -> clear
            { id: 'child', key: 'target' }, // child is itself being deleted -> skip
          ] });
        }
        return Promise.resolve({ rows: [] });
      });
      sinon.stub(db.users, 'query').resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });
      const queue = sinon.stub(bulkOperations, 'queue').resolves('bulk-operation:xyz');

      const req = { params: { uuid: 'target' }, query: { delete_users: 'true' } };
      await handlerFor(get)(req, res);

      expect(auth.assertPermissions.calledOnceWithExactly(
        req,
        { isOnline: true, hasAll: [ 'can_delete_contact_hierarchy', 'can_delete_users' ] }
      )).to.be.true;

      // reports matched by uuid + shortcode
      const reportsCall = db.medic.query.getCalls().find(c => c.args[0] === 'medic-client/reports_by_subject');
      expect(reportsCall.args[1].keys).to.deep.equal([ 'target', 'PID-1', 'child' ]);

      // users looked up by both facility_id and contact_id
      expect(db.users.query.args[0][1].keys).to.deep.equal([
        [ 'facility_id', 'target' ], [ 'contact_id', 'target' ],
        [ 'facility_id', 'child' ], [ 'contact_id', 'child' ],
      ]);

      // queued in order: set-contact, delete-user, then archive (reports before their subject contacts)
      const actions = queue.args[0][0];
      expect(actions.map(a => a.action)).to.deep.equal([ 'set-contact', 'delete-user', 'archive' ]);
      const byAction = Object.fromEntries(actions.map(a => [ a.action, a.operations ]));
      expect(byAction['set-contact']).to.deep.equal([ { id: 'parent-place', current_contact_id: 'target' } ]);
      expect(byAction['delete-user']).to.deep.equal([ { id: 'org.couchdb.user:chw' } ]);
      expect(byAction.archive.map(o => o.id)).to.deep.equal([ 'report-1', 'report-2', 'target', 'child' ]);

      expect(res.status.calledOnceWithExactly(202)).to.be.true;
      expect(res.json.calledOnceWithExactly({
        summary: { archive: { contacts: 2, reports: 2 }, 'set-contact': 1, 'delete-user': 1 },
        id: 'bulk-operation:xyz',
      })).to.be.true;
    });

    it('asserts only can_delete_contact_hierarchy when delete_users is not set', async () => {
      const get = sinon.stub().resolves({ _id: 'place' });
      sinon.stub(db.medic, 'query').callsFake((view) => {
        if (view === 'medic/contacts_by_depth') {
          return Promise.resolve({ rows: [ { id: 'place', value: {} } ] });
        }
        return Promise.resolve({ rows: [] });
      });
      sinon.stub(db.users, 'query').resolves({ rows: [] });
      const queue = sinon.stub(bulkOperations, 'queue').resolves('bulk-operation:1');

      const req = { params: { uuid: 'place' }, query: {} };
      await handlerFor(get)(req, res);

      expect(auth.assertPermissions.calledOnceWithExactly(
        req,
        { isOnline: true, hasAll: [ 'can_delete_contact_hierarchy' ] }
      )).to.be.true;
      const byAction = Object.fromEntries(queue.args[0][0].map(a => [ a.action, a.operations ]));
      expect(byAction['delete-user']).to.deep.equal([]);
      expect(res.status.calledOnceWithExactly(202)).to.be.true;
    });

    it('responds 200 with the summary and queues nothing for a dry run', async () => {
      const get = sinon.stub().resolves({ _id: 'place' });
      sinon.stub(db.medic, 'query').callsFake((view) => {
        if (view === 'medic/contacts_by_depth') {
          return Promise.resolve({ rows: [ { id: 'place', value: {} } ] });
        }
        if (view === 'medic-client/reports_by_subject') {
          return Promise.resolve({ rows: [ { id: 'r1' } ] });
        }
        return Promise.resolve({ rows: [] });
      });
      sinon.stub(db.users, 'query').resolves({ rows: [] });
      const queue = sinon.stub(bulkOperations, 'queue').resolves('x');

      const req = { params: { uuid: 'place' }, query: { dry_run: 'true' } };
      await handlerFor(get)(req, res);

      expect(queue.called).to.equal(false);
      expect(res.status.calledOnceWithExactly(200)).to.be.true;
      expect(res.json.calledOnceWithExactly({
        summary: { archive: { contacts: 1, reports: 1 }, 'set-contact': 0, 'delete-user': 0 },
      })).to.be.true;
    });

    it('responds 404 and does not gather when the target is not the expected type', async () => {
      const get = sinon.stub().resolves(null);
      const query = sinon.stub(db.medic, 'query');
      sinon.stub(bulkOperations, 'queue');

      const req = { params: { uuid: 'wrong' }, query: {} };
      await handlerFor(get)(req, res);

      expect(serverUtils.error.calledOnce).to.be.true;
      const err = serverUtils.error.args[0][0];
      expect(err).to.be.an.instanceOf(NotFoundError);
      expect(err.status).to.equal(404);
      expect(err.message).to.equal('Person not found');
      expect(serverUtils.error.args[0][1]).to.equal(req);
      expect(serverUtils.error.args[0][2]).to.equal(res);
      expect(query.called).to.equal(false);
    });

    it('responds 400 and queues nothing when linked users exist and delete_users is not set', async () => {
      const get = sinon.stub().resolves({ _id: 'place' });
      sinon.stub(db.medic, 'query').callsFake((view) => {
        if (view === 'medic/contacts_by_depth') {
          return Promise.resolve({ rows: [ { id: 'place', value: {} } ] });
        }
        return Promise.resolve({ rows: [] });
      });
      sinon.stub(db.users, 'query').resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });
      const queue = sinon.stub(bulkOperations, 'queue');

      const req = { params: { uuid: 'place' }, query: {} };
      await handlerFor(get)(req, res);

      expect(serverUtils.error.calledOnce).to.be.true;
      const err = serverUtils.error.args[0][0];
      expect(err).to.be.an.instanceOf(BadRequestError);
      expect(err.message).to.contain('user(s) are linked to contacts');
      expect(queue.called).to.equal(false);
    });
  });
});
