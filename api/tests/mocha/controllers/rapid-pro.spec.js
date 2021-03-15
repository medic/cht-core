const { expect } = require('chai');
const sinon = require('sinon');
const secureSettings = require('@medic/settings');
const controller = require('../../../src/controllers/rapid-pro');
const messaging = require('../../../src/services/messaging');
const serverUtils = require('../../../src/server-utils');

let res;

describe('rapidPro controller', () => {
  beforeEach(() => {
    res = { json: sinon.stub() };
  });

  afterEach(() => sinon.restore());

  describe('incomingMessages', () => {
    it('returns error when key not configured', () => {
      const req = {
        body: {},
        headers: { authorization: 'somekey' },
      };
      sinon.stub(secureSettings, 'getCredentials').resolves();
      sinon.stub(serverUtils, 'error').returns();
      return controller.incomingMessages(req, res).then(() => {
        expect(serverUtils.error.callCount).to.equal(1);
        expect(res.json.callCount).to.equal(0);
        expect(secureSettings.getCredentials.callCount).to.equal(1);
        expect(secureSettings.getCredentials.args[0]).to.deep.equal(['rapidpro:incoming']);
      });
    });

    it('returns error when no key given', () => {
      const req = {
        body: {},
      };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      sinon.stub(serverUtils, 'error').returns();
      return controller.incomingMessages(req, res).then(() => {
        expect(serverUtils.error.callCount).to.equal(1);
        expect(res.json.callCount).to.equal(0);
        expect(secureSettings.getCredentials.callCount).to.equal(1);
        expect(secureSettings.getCredentials.args[0]).to.deep.equal(['rapidpro:incoming']);
      });
    });

    it('returns error when key does not match', () => {
      const req = {
        body: {},
        headers: { authorization: 'somekey' },
      };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      sinon.stub(serverUtils, 'error').returns();
      return controller.incomingMessages(req, res).then(() => {
        expect(serverUtils.error.callCount).to.equal(1);
        expect(res.json.callCount).to.equal(0);
      });
    });

    it('passes the message to the service', () => {
      const req = {
        headers: { authorization: 'mykey' },
        body: { id: '123', from: '+456', content: 'sms content' },
      };
      sinon.stub(secureSettings, 'getCredentials').resolves('mykey');
      sinon.stub(messaging, 'processIncomingMessages').resolves({ saved: 1 });
      return controller.incomingMessages(req, res).then(() => {
        expect(messaging.processIncomingMessages.callCount).to.equal(1);
        expect(messaging.processIncomingMessages.args[0][0]).to.deep.equal([
          { id: '123', from: '+456', content: 'sms content' }
        ]);
        expect(res.json.callCount).to.equal(1);
        expect(res.json.args[0][0]).to.deep.equal({ saved: 1 });
      });
    });
  });
});
