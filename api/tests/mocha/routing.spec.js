

const rewire = require('rewire');
const { expect } = require('chai');
const routing = rewire('./../../src/routing');

describe('Routing', () => {
  before(() => global.angular = {
    module: () => ({
      controller: () => {},
    }),
  });

  after(() => delete global.angular);

  it('Content Security policy build url matches actual', () => {
    const adminUpgrade = rewire('./../../../admin/src/js/controllers/upgrade');
    const cspBuildDb = routing.__get__('BUILDS_DB');
    const actualBuildDb = adminUpgrade.__get__('BUILDS_DB');
    expect(cspBuildDb).to.not.eq(undefined);
    expect(cspBuildDb).to.eq(actualBuildDb);
  });
});
