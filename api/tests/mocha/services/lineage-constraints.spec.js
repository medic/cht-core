const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../src/db');
const { BadRequestError } = require('../../../src/errors');
const config = require('../../../src/config');
const { assertMoveIsLegal } = require('../../../src/services/lineage-constraints');

const CONTACT_TYPES = [
  { id: 'district_hospital', parents: [] },
  { id: 'health_center', parents: [ 'district_hospital' ] },
  { id: 'clinic', parents: [ 'health_center' ] },
  { id: 'person', parents: [ 'district_hospital', 'health_center', 'clinic' ], person: true },
];

const district = { _id: 'district', type: 'district_hospital' };
const healthCenterA = { _id: 'hc-a', type: 'health_center', parent: { _id: 'district' } };
const healthCenterB = { _id: 'hc-b', type: 'health_center', parent: { _id: 'district' } };
const clinic = { _id: 'clinic-1', type: 'clinic', parent: { _id: 'hc-a', parent: { _id: 'district' } } };
// Under hc-b, so it is not an ancestor or descendant of hc-a: lets the type check be tested alone.
const clinicUnderB = { _id: 'clinic-b', type: 'clinic', parent: { _id: 'hc-b', parent: { _id: 'district' } } };

describe('lineage-constraints', () => {
  beforeEach(() => sinon.stub(config, 'getAll').returns({ contact_types: CONTACT_TYPES }));
  afterEach(() => sinon.restore());

  const stubNoAncestorLookup = () => sinon.stub(db.medic, 'query').resolves({ rows: [] });

  it('allows a legal move between parents of the same type', async () => {
    stubNoAncestorLookup();
    await expect(assertMoveIsLegal(clinic, healthCenterB, [ 'clinic-1' ])).to.be.fulfilled;
  });

  it('allows a type with no configured parents to move to the root', async () => {
    const nested = { _id: 'district', type: 'district_hospital', parent: { _id: 'somewhere' } };
    stubNoAncestorLookup();
    await expect(assertMoveIsLegal(nested, null, [ 'district' ])).to.be.fulfilled;
  });

  it('rejects a move to the parent the contact already has', async () => {
    await expect(assertMoveIsLegal(clinic, healthCenterA, [ 'clinic-1' ]))
      .to.be.rejectedWith('already has that parent');
  });

  it('rejects a move to the root for a contact already at the root', async () => {
    await expect(assertMoveIsLegal(district, null, [ 'district' ]))
      .to.be.rejectedWith('already has that parent');
  });

  it('reports violations as BadRequestError so other failures are not masked as 400s', async () => {
    const err = await assertMoveIsLegal(clinic, clinic, [ 'clinic-1' ]).catch(e => e);
    expect(err).to.be.an.instanceOf(BadRequestError);
    expect(err.code).to.equal(400);
  });

  it('lets a database failure propagate instead of reporting it as an invalid move', async () => {
    sinon.stub(db.medic, 'query').rejects(new Error('couch is down'));
    const err = await assertMoveIsLegal(clinic, healthCenterB, [ 'clinic-1' ]).catch(e => e);
    expect(err).to.not.be.an.instanceOf(BadRequestError);
    expect(err.message).to.equal('couch is down');
  });

  it('rejects moving a contact to itself', async () => {
    await expect(assertMoveIsLegal(clinic, clinic, [ 'clinic-1' ]))
      .to.be.rejectedWith('cannot move a contact to itself');
  });

  it('rejects a circular hierarchy', async () => {
    // a place beneath the contact being moved, and not its current parent
    const descendant = {
      _id: 'nested',
      type: 'health_center',
      parent: { _id: 'clinic-1', parent: { _id: 'hc-a' } },
    };
    await expect(assertMoveIsLegal(clinic, descendant, [ 'clinic-1' ]))
      .to.be.rejectedWith('circular hierarchy');
  });

  it('rejects a destination that is not a permitted parent type', async () => {
    await expect(assertMoveIsLegal(healthCenterA, clinicUnderB, [ 'hc-a' ]))
      .to.be.rejectedWith(`contacts of type 'health_center' cannot have parent of type 'clinic'`);
  });

  it('rejects moving a contact to the root when its type requires a parent', async () => {
    await expect(assertMoveIsLegal(clinic, null, [ 'clinic-1' ]))
      .to.be.rejectedWith(`contacts of type 'clinic' cannot be moved to the root`);
  });

  it('rejects a source whose type is not configured', async () => {
    const unknown = { _id: 'x', type: 'not_a_type' };
    await expect(assertMoveIsLegal(unknown, healthCenterB, [ 'x' ]))
      .to.be.rejectedWith(`cannot move contact with unknown type 'not_a_type'`);
  });

  it('rejects a destination whose type is not configured', async () => {
    const unknownDestination = { _id: 'y', type: 'not_a_type' };
    await expect(assertMoveIsLegal(clinic, unknownDestination, [ 'clinic-1' ]))
      .to.be.rejectedWith(`destination contact 'y' has an unknown type`);
  });

  it('makes no database lookup when the contact stays under the same lineage', async () => {
    // A person moved from a health center down into one of its own clinics keeps every ancestor, so
    // nothing can be stranded and the view is never queried.
    const query = sinon.stub(db.medic, 'query');
    const person = { _id: 'person-1', type: 'person', parent: { _id: 'hc-a', parent: { _id: 'district' } } };

    await expect(assertMoveIsLegal(person, clinic, [ 'person-1' ])).to.be.fulfilled;

    expect(query.called).to.equal(false);
  });

  it('rejects a move that would strand a primary contact', async () => {
    // hc-a drops out of the lineage, and its primary contact is inside the moved subtree.
    sinon.stub(db.medic, 'query').resolves({ rows: [
      { id: 'hc-a', value: { primary_contact: 'person-in-subtree' } },
    ] });

    await expect(assertMoveIsLegal(clinic, healthCenterB, [ 'clinic-1', 'person-in-subtree' ]))
      .to.be.rejectedWith(`it would strand the primary contact of 'hc-a'`);
  });

  it('allows the move when the dropped ancestor keeps a primary contact outside the subtree', async () => {
    sinon.stub(db.medic, 'query').resolves({ rows: [
      { id: 'hc-a', value: { primary_contact: 'someone-else' } },
    ] });

    await expect(assertMoveIsLegal(clinic, healthCenterB, [ 'clinic-1' ])).to.be.fulfilled;
  });

  // Pre-existing bad data on the source is not the move's concern.
  it('allows a move even when the source has a place as its own primary contact', async () => {
    const withPlaceContact = { ...clinic, contact: { _id: 'hc-a' } };
    stubNoAncestorLookup();

    await expect(assertMoveIsLegal(withPlaceContact, healthCenterB, [ 'clinic-1' ])).to.be.fulfilled;
  });

  it('allows a move even when the source points at a primary contact that no longer exists', async () => {
    const withMissingContact = { ...clinic, contact: { _id: 'gone' } };
    stubNoAncestorLookup();

    await expect(assertMoveIsLegal(withMissingContact, healthCenterB, [ 'clinic-1' ])).to.be.fulfilled;
  });
});
