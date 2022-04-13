const { expect } = require('chai');
const sinon = require('sinon');

const wantsJSON = require('../../../src/middleware/wants-json');
const serverUtils = require('../../../src/server-utils');

describe('wants-json middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {};
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should call next middleware if request wants json', () => {
    sinon.stub(serverUtils, 'wantsJSON').returns(true);

    wantsJSON.wantsJSON(req, res, next);

    expect(serverUtils.wantsJSON.args).to.deep.equal([[req]]);
    expect(next.args).to.deep.equal([[]]);
  });

  it('should call next route if request does not want json', () => {
    sinon.stub(serverUtils, 'wantsJSON').returns(false);

    wantsJSON.wantsJSON(req, res, next);

    expect(serverUtils.wantsJSON.args).to.deep.equal([[req]]);
    expect(next.args).to.deep.equal([['route']]);
  });
});
