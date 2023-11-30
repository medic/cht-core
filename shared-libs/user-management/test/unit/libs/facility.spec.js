const { expect } = require('chai');
const sinon = require('sinon');

const { list } = require('../../../src/libs/facility');
const db = require('../../../src/libs/db');

describe('facility', () => {

  const userA = { doc: { facility_id: 'a' } };
  const userB = { doc: { facility_id: 'b' } };

  const settingA = { contact_id: 'a' };
  const settingB = { contact_id: 'e' };

  const facilityA = { _id: 'a' };
  const facilityB = { _id: 'b' };
  const facilityNotFound = { error: 'not_found' };

  let allDocs;

  beforeEach(() => {
    allDocs = sinon.stub();
    db.init({ medic: { allDocs } });
  });

  it('handles empty args', async () => {
    const result = await list([], []);
    expect(result).to.be.empty;
    expect(allDocs.callCount).to.equal(0);
  });

  it('handles incomplete arg docs', async () => {
    const result = await list([{}], [{}]);
    expect(result).to.be.empty;
    expect(allDocs.callCount).to.equal(0);
  });

  it('finds all facilities', async () => {
    allDocs.resolves({ rows: [
      { doc: facilityA },
      { doc: facilityB },
      facilityNotFound,
    ] });
    const result = await list([ userA, userB ], [ settingA, settingB ]);
    expect(result).to.deep.equal([ facilityA, facilityB ]);
  });

});
