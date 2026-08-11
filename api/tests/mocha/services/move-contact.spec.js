const sinon = require('sinon');
const { expect } = require('chai');
const { Contact, Qualifier } = require('@medic/cht-datasource');

const db = require('../../../src/db');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const dataContext = require('../../../src/services/data-context');
const { NotFoundError, BadRequestError } = require('../../../src/errors');
const request = require('@medic/couch-request');
const bulkOperations = require('../../../src/services/bulk-operations');
const constraints = require('../../../src/services/hierarchy/lineage-constraints');
const moveContact = require('../../../src/services/move-contact');

// The service rewrites lineage in place on the docs it fetched, so every test gets fresh copies.
const healthCenterB = () => ({ _id: 'hc-b', type: 'health_center', parent: { _id: 'district' } });
// The subtree being moved: a clinic under hc-a, with one person inside it.
const clinic = () => ({ _id: 'clinic-1', type: 'clinic', parent: { _id: 'hc-a', parent: { _id: 'district' } } });
const person = () => ({
  _id: 'person-1',
  type: 'person',
  parent: { _id: 'clinic-1', parent: { _id: 'hc-a', parent: { _id: 'district' } } },
});

// Pages can carry the same ids, so stubs match the exact key list rather than "contains".
const keysAre = (...ids) => sinon.match(opts => Array.isArray(opts.keys)
  && opts.keys.length === ids.length
  && ids.every((id, i) => opts.keys[i] === id));

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

describe('move-contact service', () => {
  let contactGet;
  let handler;
  let queue;

  beforeEach(() => {
    // handleMove binds the datasource itself, so the stub only has to be in place before it is called.
    contactGet = sinon.stub();
    sinon.stub(dataContext, 'bind').withArgs(Contact.v1.get).returns(contactGet);
    sinon.stub(auth, 'assertPermissions').resolves();
    sinon.stub(serverUtils, 'error');
    sinon.stub(constraints, 'assertMoveIsLegal').resolves();
    queue = sinon.stub(bulkOperations, 'queue').resolves('bulk-operation:1');

    contactGet.resolves(healthCenterB());

    sinon.stub(db.medic, 'query');
    // ids only: the service pages the documents in separately
    db.medic.query.withArgs('medic/contacts_by_depth')
      .resolves({ rows: [ { id: 'clinic-1' }, { id: 'person-1' } ] });
    db.medic.query.withArgs('medic/contacts_by_primary_contact').resolves({ rows: [] });
    sinon.stub(request, 'post').resolves({ hits: [] });
    sinon.stub(db.medic, 'allDocs');
    db.medic.allDocs.resolves({ rows: [] });
    db.medic.allDocs
      .withArgs(keysAre('clinic-1', 'person-1'))
      .resolves({ rows: [ { doc: clinic() }, { doc: person() } ] });

    handler = moveContact.handleMove({ get: sinon.stub().resolves(clinic()), type: 'Place' });
  });

  afterEach(() => sinon.restore());

  it('queues both actions and responds 202 with the summary', async () => {
    const res = buildRes();

    await handler(buildReq(), res);

    expect(auth.assertPermissions.args[0][1]).to.deep.equal({
      isOnline: true,
      hasAll: [ 'can_move_contact_hierarchy' ],
    });
    expect(res.status.args[0][0]).to.equal(202);

    const [ actions ] = queue.args[0];
    expect(actions.map(a => a.action)).to.deep.equal([ 'set-parent', 'set-contact' ]);

    // Both the source and its descendant get a new parent lineage rooted at the destination.
    const setParent = actions[0].operations;
    expect(setParent).to.deep.equal([
      { id: 'clinic-1', current_parent_id: 'hc-a', parent: { _id: 'hc-b', parent: { _id: 'district' } } },
      {
        id: 'person-1',
        current_parent_id: 'clinic-1',
        parent: { _id: 'clinic-1', parent: { _id: 'hc-b', parent: { _id: 'district' } } },
      },
    ]);

    expect(res.json.args[0][0]).to.deep.equal({
      summary: { 'set-parent': 2, 'set-contact': { reports: 0, places: 0 } },
      id: 'bulk-operation:1',
    });
  });

  it('fetches the destination through cht-datasource', async () => {
    await handler(buildReq(), buildRes());

    expect(contactGet.args[0]).to.deep.equal([ Qualifier.byUuid('hc-b') ]);
  });

  it('responds 200 with the summary and queues nothing for a dry run', async () => {
    const res = buildRes();

    await handler(buildReq({ query: { dry_run: 'true' } }), res);

    expect(queue.called).to.equal(false);
    expect(res.status.args[0][0]).to.equal(200);
    expect(res.json.args[0][0]).to.deep.equal({
      summary: { 'set-parent': 2, 'set-contact': { reports: 0, places: 0 } },
    });
  });

  it('refreshes the cached lineage on reports the moved contacts authored', async () => {
    request.post.resolves({ hits: [ { id: 'report-1' } ] });
    db.medic.allDocs.withArgs(keysAre('report-1')).resolves({ rows: [ { doc: {
      _id: 'report-1',
      type: 'data_record',
      contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: { _id: 'hc-a' } } },
    } } ] });
    const res = buildRes();

    await handler(buildReq(), res);

    const setContact = queue.args[0][0][1].operations;
    expect(setContact).to.have.length(1);
    expect(setContact[0].id).to.equal('report-1');
    expect(setContact[0].current_contact_id).to.equal('person-1');
    expect(setContact[0].contact.parent.parent).to.deep.equal({ _id: 'hc-b', parent: { _id: 'district' } });
    expect(res.json.args[0][0].summary['set-contact']).to.deep.equal({ reports: 1, places: 0 });
  });

  it('queries the nouveau index by lowercased contact id', async () => {
    await handler(buildReq(), buildRes());

    const { uri, body } = request.post.args[0][0];
    expect(uri).to.include('_design/medic/_nouveau/reports_by_freetext');
    expect(body.q).to.equal('exact_match:("contact:clinic-1" OR "contact:person-1")');
  });

  it('pages the nouveau results with the bookmark rather than capping them', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: `r-${i}` }));
    request.post.onFirstCall().resolves({ hits: full, bookmark: 'page-2' });
    request.post.onSecondCall().resolves({ hits: [ { id: 'r-last' } ] });

    await handler(buildReq(), buildRes());

    expect(request.post.callCount).to.equal(2);
    expect(request.post.args[0][0].body.bookmark).to.be.null;
    expect(request.post.args[1][0].body.bookmark).to.equal('page-2');
  });

  it('stops paging when the bookmark does not advance, rather than looping forever', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({ id: `r-${i}` }));
    // A misbehaving index that keeps returning a full page and the same bookmark.
    request.post.resolves({ hits: full, bookmark: 'stuck' });

    await handler(buildReq(), buildRes());

    expect(request.post.callCount).to.equal(2);
  });

  it('escapes quotes and backslashes in ids before they reach the query', async () => {
    db.medic.query.withArgs('medic/contacts_by_depth')
      .resolves({ rows: [ { id: 'we"ird\\id' } ] });

    await handler(buildReq(), buildRes());

    expect(request.post.args[0][0].body.q).to.equal('exact_match:("contact:we\\"ird\\\\id")');
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

  it('refreshes a surviving place whose primary contact moved, without clearing it', async () => {
    db.medic.query.withArgs('medic/contacts_by_primary_contact').resolves({ rows: [ { id: 'hc-a' } ] });
    db.medic.allDocs.withArgs(keysAre('hc-a')).resolves({ rows: [ { doc: {
      _id: 'hc-a',
      type: 'health_center',
      contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: { _id: 'hc-a' } } },
    } } ] });
    const res = buildRes();

    await handler(buildReq(), res);

    const setContact = queue.args[0][0][1].operations;
    expect(setContact).to.have.length(1);
    expect(setContact[0].id).to.equal('hc-a');
    expect(setContact[0].contact._id).to.equal('person-1'); // reference kept, only the lineage refreshed
    expect(res.json.args[0][0].summary['set-contact']).to.deep.equal({ reports: 0, places: 1 });
  });

  it('refreshes a moving place whose own primary contact is moving with it', async () => {
    // The source is also the holder of its own primary contact, so both fields have to be rewritten.
    db.medic.query.withArgs('medic/contacts_by_primary_contact').resolves({ rows: [ { id: 'clinic-1' } ] });
    db.medic.allDocs.withArgs(keysAre('clinic-1')).resolves({ rows: [ { doc: {
      ...clinic(),
      contact: { _id: 'person-1', parent: { _id: 'clinic-1', parent: { _id: 'hc-a', parent: { _id: 'district' } } } },
    } } ] });
    const res = buildRes();

    await handler(buildReq(), res);

    const setContact = queue.args[0][0][1].operations;
    expect(setContact).to.have.length(1);
    expect(setContact[0].id).to.equal('clinic-1');
    expect(setContact[0].current_contact_id).to.equal('person-1');
    expect(setContact[0].contact).to.deep.equal({
      _id: 'person-1',
      parent: { _id: 'clinic-1', parent: { _id: 'hc-b', parent: { _id: 'district' } } },
    });
    expect(res.json.args[0][0].summary['set-contact']).to.deep.equal({ reports: 0, places: 1 });
  });

  it('moves to the top level when parent_id is omitted', async () => {
    const res = buildRes();

    await handler(buildReq({ body: {} }), res);

    expect(contactGet.called).to.equal(false);
    const setParent = queue.args[0][0][0].operations;
    expect(setParent[0]).to.deep.equal({ id: 'clinic-1', current_parent_id: 'hc-a', parent: undefined });
    expect(res.status.args[0][0]).to.equal(202);
  });

  it('moves to the top level when there is no body at all', async () => {
    const res = buildRes();

    await handler(buildReq({ body: undefined }), res);

    expect(contactGet.called).to.equal(false);
    expect(res.status.args[0][0]).to.equal(202);
  });

  it('responds 404 and queues nothing when the target is not the expected type', async () => {
    handler = moveContact.handleMove({ get: sinon.stub().resolves(null), type: 'Place' });
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(NotFoundError);
    expect(err.message).to.equal('Place not found');
  });

  it('responds 400 and queues nothing when the move is not legal', async () => {
    constraints.assertMoveIsLegal.rejects(new BadRequestError('circular hierarchy'));
    const res = buildRes();

    await handler(buildReq(), res);

    expect(queue.called).to.equal(false);
    const err = serverUtils.error.args[0][0];
    expect(err).to.be.an.instanceOf(BadRequestError);
    expect(err.message).to.equal('circular hierarchy');
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
});
