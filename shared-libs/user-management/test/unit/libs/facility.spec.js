const { expect } = require('chai');
const sinon = require('sinon');

const { list } = require('../../../src/libs/facility');
const db = require('../../../src/libs/db');

describe('facility', () => {

  const userA = { facility_id: 'a', contact_id: 'a' };
  const userB = { facility_id: 'b', contact_id: 'e' };

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
    const result = await list([userA, userB]);
    expect(result).to.deep.equal([ facilityA, facilityB ]);
    expect(allDocs.callCount).to.equal(1);
    expect(allDocs.args[0][0].keys).to.deep.equal([ 'a', 'b', 'e' ]);
  });

});
