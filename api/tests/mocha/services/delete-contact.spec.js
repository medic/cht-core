const sinon = require('sinon');
const { expect } = require('chai');

const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const bulkOperations = require('../../../src/services/bulk-operations');
const planners = require('../../../src/services/bulk-operation-planners');
const { NotFoundError, BadRequestError } = require('../../../src/errors');
const service = require('../../../src/services/delete-contact');

describe('Delete contact service', () => {
  let res;
  let queue;
  let validate;
  let plan;

  beforeEach(() => {
    sinon.stub(auth, 'assertPermissions').resolves({ name: 'jsmith' });
    sinon.stub(serverUtils, 'error');
    queue = sinon.stub(bulkOperations, 'queue').resolves('bulk-operation:xyz');
    validate = sinon.stub(planners, 'validate').resolves();
    plan = sinon.stub(planners, 'plan').resolves({ summary: { delete: { contacts: 1, reports: 0 } } });
    res = { status: sinon.stub().returnsThis(), json: sinon.stub() };
  });

  afterEach(() => sinon.restore());

  // The delete is only reachable through the shared handler, so it is tested through it: each test
  // builds the handler with a `get` (the type-specific fetch the controllers pass in). What the
  // operation actually touches is decided by the planner, which has its own tests.
  const handlerFor = (get) => service.handleDelete({ get, type: 'Person' });

  describe('handleDelete', () => {
    it('records the operation and responds 202 with its id', async () => {
      const get = sinon.stub().resolves({ _id: 'target' });

      const req = { params: { uuid: 'target' }, query: { delete_users: 'true' } };
      await handlerFor(get)(req, res);

      expect(auth.assertPermissions.calledOnceWithExactly(
        req,
        { isOnline: true, hasAll: [ 'can_delete_contact_hierarchy', 'can_delete_users' ] }
      )).to.be.true;

      expect(validate.calledOnceWithExactly('delete-contact', { contact_id: 'target', delete_users: true }))
        .to.be.true;
      expect(queue.calledOnceWithExactly(
        'delete-contact', { contact_id: 'target', delete_users: true }, 'jsmith'
      )).to.be.true;
      // nothing is planned here: Sentinel does that when it runs the operation
      expect(plan.called).to.equal(false);

      expect(res.status.calledOnceWithExactly(202)).to.be.true;
      expect(res.json.calledOnceWithExactly({ id: 'bulk-operation:xyz' })).to.be.true;
    });

    it('asserts only can_delete_contact_hierarchy when delete_users is not set', async () => {
      const get = sinon.stub().resolves({ _id: 'place' });

      const req = { params: { uuid: 'place' }, query: {} };
      await handlerFor(get)(req, res);

      expect(auth.assertPermissions.calledOnceWithExactly(
        req,
        { isOnline: true, hasAll: [ 'can_delete_contact_hierarchy' ] }
      )).to.be.true;
      expect(queue.args[0][1]).to.deep.equal({ contact_id: 'place', delete_users: false });
      expect(res.status.calledOnceWithExactly(202)).to.be.true;
    });

    it('responds 200 with the summary and records nothing for a dry run', async () => {
      const get = sinon.stub().resolves({ _id: 'place' });
      plan.resolves({ summary: { delete: { contacts: 1, reports: 1 } } });

      const req = { params: { uuid: 'place' }, query: { dry_run: 'true' } };
      await handlerFor(get)(req, res);

      expect(plan.calledOnceWithExactly('delete-contact', { contact_id: 'place', delete_users: false }))
        .to.be.true;
      expect(queue.called).to.equal(false);
      expect(res.status.calledOnceWithExactly(200)).to.be.true;
      expect(res.json.calledOnceWithExactly({ summary: { delete: { contacts: 1, reports: 1 } } })).to.be.true;
    });

    it('responds 404 and validates nothing when the target is not the expected type', async () => {
      const get = sinon.stub().resolves(null);

      const req = { params: { uuid: 'wrong' }, query: {} };
      await handlerFor(get)(req, res);

      expect(serverUtils.error.calledOnce).to.be.true;
      const err = serverUtils.error.args[0][0];
      expect(err).to.be.an.instanceOf(NotFoundError);
      expect(err.status).to.equal(404);
      expect(err.message).to.equal('Person not found');
      expect(serverUtils.error.args[0][1]).to.equal(req);
      expect(serverUtils.error.args[0][2]).to.equal(res);
      expect(validate.called).to.equal(false);
      expect(queue.called).to.equal(false);
    });

    it('responds 400 and records nothing when the planner refuses the operation', async () => {
      const get = sinon.stub().resolves({ _id: 'place' });
      validate.rejects(new BadRequestError('1 user(s) are linked to contacts in this hierarchy.'));

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
