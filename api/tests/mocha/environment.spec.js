const rewire = require('rewire');
const { expect } = require('chai');

let environment;

describe('environment', () => {
  beforeEach(() => {
    environment = rewire('../../src/environment');
  });

  it('buildPath should return build path', () => {
    environment.__set__('__dirname', 'absolute/path/to/api/src');
    expect(environment.getBuildPath()).to.equal('absolute/path/to/api/build');
  });

  it('getStaticPath should return static path', () => {
    environment.__set__('__dirname', 'absolute/path/to/api/src');
    expect(environment.getStaticPath()).to.equal('absolute/path/to/api/build/static');
  });

  it('getDefaultDocsPath should return default docs path', () => {
    environment.__set__('__dirname', 'absolute/path/to/api/src');
    expect(environment.getDefaultDocsPath()).to.equal('absolute/path/to/api/build/default-docs');
  });

  it('getResourcesPath should return resources path', () => {
    environment.__set__('__dirname', 'absolute/path/to/api/src');
    expect(environment.getResourcesPath()).to.equal('absolute/path/to/api/resources');
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
