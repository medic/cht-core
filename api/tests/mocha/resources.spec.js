const rewire = require('rewire');
const { expect } = require('chai');
const path = require('path');

let resources;

describe('resources', () => {
  beforeEach(() => {
    resources = rewire('../../src/resources.js');
  });

  it('buildPath should return build path', () => {
    expect(resources.buildPath).to.equal(path.resolve(__dirname, '../../build'));
  });

  it('getStaticPath should return static path', () => {
    expect(resources.staticPath).to.equal(path.resolve(__dirname, '../../build/static'));
  });

  it('getDefaultDocsPath should return default docs path', () => {
    expect(resources.defaultDocsPath).to.equal(path.resolve(__dirname, '../../build/default-docs'));
  });

  it('getResourcesPath should return resources path', () => {
    expect(resources.resourcesPath).to.equal(path.resolve(__dirname, '../../resources'));
  });
});
