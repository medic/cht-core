const sinon = require('sinon');
const rewire = require('rewire');
const serverUtils = require('../../../src/server-utils');

let controller;

require('chai').should();

describe('Changes controller', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    controller = rewire('../../../src/controllers/changes');
  });

  it('should resond with ddoc and service worker meta', async () => {

  });

  it('should fail on error', async () => {

  });
});
