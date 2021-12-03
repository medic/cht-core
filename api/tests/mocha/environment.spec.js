const rewire = require('rewire');
const { expect } = require('chai');
const path = require('path');

let environment;

describe('environment', () => {
  beforeEach(() => {
    environment = rewire('../../src/environment');
  });

  it('buildPath should return build path', () => {
    expect(environment.buildPath).to.equal(path.resolve(__dirname, '../../build'));
  });

  it('getStaticPath should return static path', () => {
    expect(environment.staticPath).to.equal(path.resolve(__dirname, '../../build/static'));
  });

  it('getDefaultDocsPath should return default docs path', () => {
    expect(environment.defaultDocsPath).to.equal(path.resolve(__dirname, '../../build/default-docs'));
  });

  it('getResourcesPath should return resources path', () => {
    expect(environment.resourcesPath).to.equal(path.resolve(__dirname, '../../resources'));
  });

  it('should set, get and update deploy info correctly', () => {
    expect(environment.getDeployInfo()).to.equal(undefined);
    environment.setDeployInfo({ version: 'my version' });
    expect(environment.getDeployInfo()).to.deep.equal({ version: 'my version' });
    environment.setDeployInfo(false);
    expect(environment.getDeployInfo()).to.equal(false);
    environment.setDeployInfo({ version: 'new version', timestamp: 100 });
    expect(environment.getDeployInfo()).to.deep.equal({ version: 'new version', timestamp: 100 });
  });
});
