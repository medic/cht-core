const sinon = require('sinon');
const chai = require('chai');

const controller = require('../../../src/controllers/impact');

describe('Impact controller', () => {
  let req;
  let res;

  beforeEach(() => {
    req = { query: {} };
    res = { json: sinon.stub(), status: sinon.stub() };
    res.status.returns(res);
  });

  afterEach(() => sinon.restore());

  describe('v1', () => {
    it('responds 501', () => {
      controller.v1.get(req, res);

      chai.expect(res.status.args).to.deep.equal([[ 501 ]]);
      chai.expect(res.json.args).to.deep.equal([[
        { code: 501, error: 'Not implemented in this release.' }
      ]]);
    });
  });

});
