const sinon = require('sinon');
const chai = require('chai');

const auth = require('../../../src/auth');
const authorization = require('../../../src/services/authorization');
const controller = require('../../../src/controllers/db-config');
const serverUtils = require('../../../src/server-utils');

let req;
let res;

describe.only('DB config Controller', () => {
  beforeEach(() => {
    req = {};
    res = { json: sinon.stub() };
    sinon.stub(authorization, 'isDbAdmin');
    sinon.stub(serverUtils, 'error');
  });

  afterEach(() => sinon.restore());

  it.only('should respond with error when user does not have required permissions', () => {
    serverUtils.error.resolves();
    auth.isDbAdmin.returns(false);
    return controller.getAttachments(req, res).then(() => {
      chai.expect(auth.isDbAdmin.callCount).to.equal(1);
      chai.expect(serverUtils.error.args[0])
        .to.deep.equal([{ code: 401, reason: 'Insufficient privileges' }, req, res]);
      chai.expect(res.json.callCount).to.equal(0);
      chai.expect(serverUtils.error.callCount).to.equal(1);
    });
  });
});
