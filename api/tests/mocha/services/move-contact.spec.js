const sinon = require('sinon');
const { expect } = require('chai');
const { Contact, Qualifier } = require('@medic/cht-datasource');

const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const dataContext = require('../../../src/services/data-context');
const { NotFoundError, BadRequestError } = require('../../../src/errors');
const bulkOperations = require('../../../src/services/bulk-operations');
const planners = require('../../../src/services/bulk-operation-planners');
const moveContact = require('../../../src/services/move-contact');

const healthCenterB = { _id: 'hc-b', type: 'health_center', parent: { _id: 'district' } };
const clinic = { _id: 'clinic-1', type: 'clinic', parent: { _id: 'hc-a', parent: { _id: 'district' } } };

const buildRes = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

const buildReq = (overrides = {}) => ({
  params: { uuid: 'clinic-1' },
  query: {},
  body: { parent_id: 'hc-b' },
  ...overrides,
});

// What the operation actually touches is decided by the planner, which has its own tests. These
// cover the handler: permissions, the params it records, and the responses.
describe('move-contact service', () => {
  let contactGet;
  let handler;
  let queue;
  let validate;
  let plan;

  beforeEach(() => {
    contactGet = sinon.stub().resolves(healthCenterB);
    sinon.stub(dataContext, 'bind').withArgs(Contact.v1.get).returns(contactGet);
    sinon.stub(auth, 'assertPermissions').resolves({ name: 'jsmith' });
    sinon.stub(serverUtils, 'error');
    queue = sinon.stub(bulkOperations, 'queue').resolves('bulk-operation:1');
    validate = sinon.stub(planners, 'validate').resolves();
    plan = sinon.stub(planners, 'plan')
      .resolves({ summary: { 'set-parent': 2, 'set-contact': { reports: 0, places: 0 } } });

    handler = moveContact.handleMove({ get: sinon.stub().resolves(clinic), type: 'Place' });
  });

  afterEach(() => sinon.restore());

  it('records the operation and responds 202 with its id', async () => {
    const res = buildRes();

    await handler(buildReq(), res);

    expect(auth.assertPermissions.args[0][1]).to.deep.equal({
      isOnline: true,
      hasAll: [ 'can_move_contact_hierarchy' ],
    });
    expect(validate.calledOnceWithExactly('move-contact', { contact_id: 'clinic-1', parent_id: 'hc-b' }))
      .to.be.true;
    expect(queue.calledOnceWithExactly(
      'move-contact', { contact_id: 'clinic-1', parent_id: 'hc-b' }, 'jsmith'
    )).to.be.true;
    // nothing is planned here: Sentinel does that when it runs the operation
    expect(plan.called).to.equal(false);

    expect(res.status.args[0][0]).to.equal(202);
    expect(res.json.args[0][0]).to.deep.equal({ id: 'bulk-operation:1' });
  });

  it('fetches the destination through cht-datasource', async () => {
    await handler(buildReq(), buildRes());

    expect(contactGet.args[0]).to.deep.equal([ Qualifier.byUuid('hc-b') ]);
  });

  it('responds 200 with the summary and records nothing for a dry run', async () => {
    const res = buildRes();

    await handler(buildReq({ query: { dry_run: 'true' } }), res);

    expect(plan.calledOnceWithExactly('move-contact', { contact_id: 'clinic-1', parent_id: 'hc-b' }))
      .to.be.true;
    expect(queue.called).to.equal(false);
    expect(res.status.args[0][0]).to.equal(200);
    expect(res.json.args[0][0]).to.deep.equal({
      summary: { 'set-parent': 2, 'set-contact': { reports: 0, places: 0 } },
    });
  });

  it('records a move to the top level when parent_id is omitted', async () => {
    const res = buildRes();

    await handler(buildReq({ body: {} }), res);

    expect(contactGet.called).to.equal(false);
    expect(queue.args[0][1]).to.deep.equal({ contact_id: 'clinic-1', parent_id: null });
    expect(res.status.args[0][0]).to.equal(202);
  });

  it('rejects a parent_id that is not a string', async () => {
    const res = buildRes();

    await handler(buildReq({ body: { parent_id: { $ne: null } } }), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(BadRequestError);
    expect(err.message).to.contain('must be a non-empty string');
  });

  it('rejects an empty parent_id rather than treating it as the root', async () => {
    const res = buildRes();

    await handler(buildReq({ body: { parent_id: '' } }), res);

    expect(queue.called).to.equal(false);
    expect(serverUtils.error.args[0][0]).to.be.an.instanceOf(BadRequestError);
  });

  it('responds 404 and records nothing when the target is not the expected type', async () => {
    handler = moveContact.handleMove({ get: sinon.stub().resolves(null), type: 'Place' });
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.called).to.equal(false);
    expect(validate.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(NotFoundError);
    expect(err.message).to.equal('Place not found');
  });

  it('responds 404 when the destination does not exist', async () => {
    contactGet.resolves(null);
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(NotFoundError);
    expect(err.message).to.equal('Destination contact hc-b not found');
  });

  it('responds 400 and records nothing when the planner refuses the move', async () => {
    validate.rejects(new BadRequestError('circular hierarchy'));
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(BadRequestError);
    expect(err.message).to.equal('circular hierarchy');
  });
});
