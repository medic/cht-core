const environment = require('../../src/environment');
const chai = require('chai');

describe('environment', () => {
  it('should set, get and update deploy info correctly', () => {
    chai.expect(environment.deployInfo()).to.equal(undefined);
    const deployInfo = { version: 'my version' };
    chai.expect(environment.deployInfo(deployInfo)).to.equal(deployInfo);
    chai.expect(environment.deployInfo()).to.equal(deployInfo);
    chai.expect(environment.deployInfo(false)).to.equal(false);
    chai.expect(environment.deployInfo()).to.equal(false);
    const newDeployInfo = { version: 'new version', timestamp: 22 };
    chai.expect(environment.deployInfo(newDeployInfo)).to.equal(newDeployInfo);
    chai.expect(environment.deployInfo(undefined)).to.equal(newDeployInfo);
  });
});
