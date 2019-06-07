const environment = require('../../src/environment');
const chai = require('chai');

describe('environment', () => {
  it('should set, get and update deploy info correctly', () => {
    chai.expect(environment.getDeployInfo()).to.equal(undefined);
    environment.setDeployInfo({ version: 'my version' });
    chai.expect(environment.getDeployInfo()).to.deep.equal({ version: 'my version' });
    environment.setDeployInfo(false);
    chai.expect(environment.getDeployInfo()).to.equal(false);
    environment.setDeployInfo({ version: 'new version', timestamp: 100 });
    chai.expect(environment.getDeployInfo()).to.deep.equal({ version: 'new version', timestamp: 100 });
  });
});
