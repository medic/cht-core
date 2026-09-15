const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../src/db');
const mutingUtils = require('../../src/lib/muting_utils');
const transitionsLibFactory = require('../../src');

describe('transitions lib factory', () => {
  afterEach(() => sinon.restore());

  it('should export muting_utils.isMutedInLineage, which api uses to gate creates on muted places', () => {
    // Passing the db module as sourceDb is deliberate: src/db.js does
    // `module.exports.init = db => module.exports = db`, so handing it itself
    // leaves the shared module untouched for the rest of the suite.
    const lib = transitionsLibFactory(db, { get: sinon.stub(), getAll: sinon.stub().returns({}) }, {});

    expect(lib.isMutedInLineage).to.equal(mutingUtils.isMutedInLineage);
    expect(lib.isMutedInLineage({ parent: { _id: 'muted-parent', muted: '2025-01-01T00:00:00Z' } }))
      .to.equal('muted-parent');
    expect(lib.isMutedInLineage({ parent: { _id: 'clean-parent' } })).to.equal(false);
  });
});
