const chai = require('chai');
const sinon = require('sinon');

const controller = require('../../../src/controllers/settings');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');
const settingsService = require('../../../src/services/settings');
const { PermissionError } = require('../../../src/errors');

let req;
let res;

describe('Settings controller', () => {
  beforeEach(() => {
    req = {};
    res = { json: sinon.stub() };
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'check');
    sinon.stub(serverUtils, 'error');
    sinon.stub(settingsService, 'get');
    sinon.stub(settingsService, 'update');
    sinon.stub(settingsService, 'getDeprecatedTransitions');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {
    it('should throw an error when not authenticated', () => {
      auth.getUserCtx.rejects({ some: 'err' });
      return controller.get(req, res).then(() => {
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
      });
    });

    it('should respond with settings', () => {
      auth.getUserCtx.resolves();
      settingsService.get.resolves({ some: 'settings' });
      return controller.get(req, res).then(() => {
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ some: 'settings' }]);
        chai.expect(serverUtils.error.callCount).to.equal(0);
      });
    });
  });

  describe('getDeprecatedTransitions', () => {
    it('should throw an error when not authenticated', () => {
      auth.getUserCtx.rejects({ some: 'err' });
      return controller.get(req, res).then(() => {
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
      });
    });

    it('should respond with deprecated transitions', () => {
      const deprecatedTransition = {
        name: 'abc',
        deprecated: true,
        deprecatedIn: '3.7.x',
        deprecationMessage: 'abc transition deprecated since 3.7.x'
      };
      auth.getUserCtx.resolves();
      settingsService.getDeprecatedTransitions.resolves([deprecatedTransition]);

      return controller.getDeprecatedTransitions(req, res).then(() => {
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0][0]).to.deep.equal(deprecatedTransition);
        chai.expect(serverUtils.error.callCount).to.equal(0);
      });
    });
  });

  describe('put', () => {
    it('should throw an error when not authenticated', () => {
      auth.check.rejects({ some: 'err' });
      return controller.put(req, res).then(() => {
        chai.expect(auth.check.callCount).to.equal(1);
        chai.expect(auth.check.args[0]).to.deep.equal([req, ['can_edit', 'can_configure']]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
      });
    });

    it('should throw an error when user does not have permission to edit', () => {
      auth.check.rejects(new PermissionError('Insufficient privileges'));
      return controller.put(req, res).then(() => {
        chai.expect(auth.check.callCount).to.equal(1);
        chai.expect(auth.check.args[0]).to.deep.equal([req, ['can_edit', 'can_configure']]);
        chai.expect(settingsService.update.callCount).to.equal(0);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([
          new PermissionError('Insufficient privileges'),
          req,
          res,
          true
        ]);
      });
    });

    it('should throw an error when the update fails', () => {
      req = { body: 'my settings' };
      auth.check.resolves();
      settingsService.update.rejects({ some: 'err' });
      return controller.put(req, res).then(() => {
        chai.expect(auth.check.callCount).to.equal(1);
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.update.args[0]).to.deep.equal(['my settings', undefined, undefined]);
        chai.expect(res.json.callCount).to.equal(0);
        chai.expect(serverUtils.error.callCount).to.equal(1);
        chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res, true]);
      });
    });

    it('should update without replace or overwrite', () => {
      auth.check.resolves();
      settingsService.update.resolves();
      req = { body: 'settings' };

      return controller.put(req, res).then(() => {
        chai.expect(auth.check.callCount).to.equal(1);
        chai.expect(auth.check.args[0]).to.deep.equal([req, ['can_edit', 'can_configure']]);
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.update.args[0]).to.deep.equal(['settings', undefined, undefined]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ success: true, updated: false }]);
      });
    });

    it('should update with replace', () => {
      auth.check.resolves();
      settingsService.update.resolves();
      req = { body: 'new settings', query: { replace: 'true' } };

      return controller.put(req, res).then(() => {
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.update.args[0]).to.deep.equal(['new settings', 'true', undefined]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ success: true, updated: false }]);
      });
    });

    it('should update with overwrite', () => {
      auth.check.resolves();
      settingsService.update.resolves();
      req = { body: 'new settings', query: { overwrite: 'something' } };

      return controller.put(req, res).then(() => {
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.update.args[0]).to.deep.equal(['new settings', undefined, 'something']);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ success: true, updated: false }]);
      });
    });

    it('should update with overwrite and replace', () => {
      auth.check.resolves();
      settingsService.update.resolves();
      req = { body: 'new settings', query: { overwrite: 'something', replace: 'false' } };

      return controller.put(req, res).then(() => {
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.update.args[0]).to.deep.equal(['new settings', 'false', 'something']);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ success: true, updated: false }]);
      });
    });

    it('should return whether or not settings were updated', () => {
      auth.check.resolves();
      settingsService.update.resolves(true);
      req = { body: 'new settings' };

      return controller.put(req, res).then(() => {
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.update.args[0]).to.deep.equal(['new settings', undefined, undefined]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ success: true, updated: true }]);
      });
    });
  });
});
