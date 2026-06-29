const sinon = require('sinon');
const chai = require('chai');

const serverUtils = require('../../../src/server-utils');
const controller = require('../../../src/controllers/bulk-operations');
const service = require('../../../src/services/bulk-operations');
const auth = require('../../../src/auth');
const { PermissionError } = require('../../../src/errors');

describe('Bulk operations controller', () => {
  let req;
  let res;

  beforeEach(() => {
    sinon.stub(serverUtils, 'error');
    req = { params: { id: 'bulk-operation:abc' } };
    res = { json: sinon.stub() };
  });

  afterEach(() => sinon.restore());

  describe('v1 get', () => {
    it('returns the bulk operation log for an authorised online user', () => {
      const log = { _id: 'bulk-operation:abc', start_date: 'date', actions: {} };
      sinon.stub(auth, 'assertPermissions').resolves();
      sinon.stub(service, 'getLog').resolves(log);

      return controller.v1.get(req, res).then(() => {
        chai.expect(auth.assertPermissions.calledOnceWithExactly(req, { isOnline: true })).to.equal(true);
        chai.expect(service.getLog.calledOnceWithExactly('bulk-operation:abc')).to.equal(true);
        chai.expect(res.json.calledOnceWithExactly(log)).to.equal(true);
        chai.expect(serverUtils.error.called).to.equal(false);
      });
    });

    it('returns a 404 when the operation is not found', () => {
      sinon.stub(auth, 'assertPermissions').resolves();
      sinon.stub(service, 'getLog').resolves(null);

      return controller.v1.get(req, res).then(() => {
        chai.expect(res.json.called).to.equal(false);
        chai.expect(serverUtils.error.calledOnce).to.equal(true);
        chai.expect(serverUtils.error.args[0][0]).to.deep.equal({ status: 404, message: 'Bulk operation not found' });
      });
    });

    it('does not reach the service when the user is not permitted', () => {
      sinon.stub(auth, 'assertPermissions').rejects(new PermissionError('Insufficient privileges'));
      sinon.stub(service, 'getLog').resolves({});

      return controller.v1.get(req, res).then(() => {
        chai.expect(service.getLog.called).to.equal(false);
        chai.expect(res.json.called).to.equal(false);
        chai.expect(serverUtils.error.calledOnce).to.equal(true);
      });
    });

    it('handles a service rejection gracefully', () => {
      sinon.stub(auth, 'assertPermissions').resolves();
      sinon.stub(service, 'getLog').rejects(new Error('db down'));

      return controller.v1.get(req, res).then(() => {
        chai.expect(res.json.called).to.equal(false);
        chai.expect(serverUtils.error.calledOnce).to.equal(true);
      });
    });
  });
});
