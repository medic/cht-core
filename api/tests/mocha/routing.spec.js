const rewire = require('rewire');
const chai = require('chai');

describe('Routing', () => {
  before(() => global.angular = {
    module: () => ({
      controller: () => {},
    }),
  });

  after(() => delete global.angular);

  it('Content Security policy build url matches actual', () => {
    const environment = rewire('./../../src/environment');
    const adminUpgrade = rewire('./../../../admin/src/js/controllers/upgrade');
    const cspBuildDb = environment.__get__('DEFAULT_BUILDS_URL');
    const actualBuildDb = adminUpgrade.__get__('BUILDS_DB');
    chai.expect(cspBuildDb).to.not.eq(undefined);
    chai.expect(cspBuildDb).to.include(actualBuildDb);
  });
});
