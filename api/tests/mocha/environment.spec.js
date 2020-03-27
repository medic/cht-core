const rewire = require('rewire');
const environment = rewire('../../src/environment');
const { expect } = require('chai');

describe('environment', () => {
  describe('getExtractedResourcesPath', () => {
    const testScenario = (env, expected) => environment.__with__(Object.assign(env, {
      __dirname: '/__dirname',
    }))(() => {
      const actual = environment.getExtractedResourcesPath();
      expect(actual).to.eq(expected);
    });

    it('default', () => testScenario({}, '/__dirname/extracted-resources'));
    it('explicit via env', () => testScenario({ MEDIC_API_RESOURCE_PATH: '/foo' }, '/foo'));
    it('default in production', () => testScenario({ NODE_ENV: 'production' }, '/tmp/extracted-resources'));
    it('explit and production', () => testScenario(
      { MEDIC_API_RESOURCE_PATH: '/foo', NODE_ENV: 'production' }, '/foo')
    );
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
