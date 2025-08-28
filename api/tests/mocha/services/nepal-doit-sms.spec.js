const chai = require('chai');
const sinon = require('sinon');
const request = require('@medic/couch-request');
const secureSettings = require('@medic/settings');
const config = require('../../../src/config');
const service = require('../../../src/services/nepal-doit-sms');

const SUCCESS_RESPONSE = {
  message: 'Success! SMS queued !',
  status: 1,
  ntc: 1,
  ncell: 0,
  invalid_number: []
};

const INVALID_CREDENTIALS_ERROR = {
  statusCode: 401,
  body: {
    message: 'Invalid credentials',
    error: 'Unauthorized'
  },
  message: '401 - {"message":"Invalid credentials","error":"Unauthorized"}'
};

const UNPROCESSABLE_CONTENT_ERROR = {
  statusCode: 422,
  body: {
    message: 'The given data was invalid.',
    errors: {
      mobile: ['The mobile format is invalid.']
    }
  },
  message: '422 - {"message":"The given data was invalid.","errors":{"mobile":["The mobile format is invalid."]}}'
};

const INTERNAL_SERVER_ERROR = {
  statusCode: 500,
  body: {
    message: 'Internal server error',
    error: 'Server Error'
  },
  message: '500 - {"message":"Internal server error","error":"Server Error"}'
};

describe('nepal doit sms service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('send', () => {

    it('fails early with bad config - no URL', () => {
      sinon.stub(config, 'get').returns({});
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        // When URL is missing, sendMessage fails and returns undefined, so no state changes
        chai.expect(actual.length).to.equal(0);
      });
    });

    it('fails early with bad config - no API key', () => {
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(secureSettings, 'getCredentials').resolves(null);
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        // When API key is missing, getCredentials returns null and send() should return no changes
        chai.expect(actual.length).to.equal(0);
      });
    });

    it('forwards messages to API and strips country code for Nepal', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').resolves(SUCCESS_RESPONSE);
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'a',
          state: 'sent',
          details: 'Processed'
        }]);
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(request.post.args[0][0].url).to.equal('https://api.example.com/sms');
        chai.expect(request.post.args[0][0].json).to.equal(true);
        chai.expect(request.post.args[0][0].body.mobile).to.equal('9876543210'); // country code stripped
        chai.expect(request.post.args[0][0].body.message).to.equal('hello');
        chai.expect(request.post.args[0][0].headers.authorization).to.equal('Bearer test-api-key');
        chai.expect(request.post.args[0][0].headers.accept).to.equal('application/json');
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(config.get.args[0][0]).to.equal('sms');
        chai.expect(secureSettings.getCredentials.callCount).to.equal(1);
        chai.expect(secureSettings.getCredentials.args[0][0]).to.equal('nepal_doit_sms:outgoing');
      });
    });

    it('handles phone numbers without country code', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').resolves(SUCCESS_RESPONSE);
      const given = [ { id: 'a', to: '9876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'a',
          state: 'sent',
          details: 'Processed'
        }]);
        chai.expect(request.post.args[0][0].body.mobile).to.equal('9876543210'); // unchanged
      });
    });

    it('handles HTTP error responses appropriately', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post')
        .onCall(0).resolves(SUCCESS_RESPONSE) // success
        .onCall(1).rejects(UNPROCESSABLE_CONTENT_ERROR) // fatal error
        .onCall(2).rejects(INTERNAL_SERVER_ERROR); // temporary error - don't update state
      const given = [
        { id: 'a', to: '+9779876543210', content: 'hello' },
        { id: 'b', to: '+97798765432111', content: 'hello' },
        { id: 'c', to: '+9779876543212', content: 'hello' }
      ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(3);
        chai.expect(actual).to.deep.equal([
          {
            messageId: 'a',
            state: 'sent',
            details: 'Processed'
          },
          {
            messageId: 'b',
            state: 'failed',
            details: 'UnprocessableContent'
          }
          // Note: no entry for 'c' because 500 errors have retry: true flag
        ]);
      });
    });

    it('handles 401 unauthorized errors', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('invalid-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').rejects(INVALID_CREDENTIALS_ERROR);
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'a',
          state: 'failed',
          details: 'InvalidCredentials'
        }]);
        chai.expect(request.post.callCount).to.equal(1);
      });
    });

    it('ignores unknown errors so they will be retried', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').rejects(new Error('Network timeout'));
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(actual.length).to.equal(0);
      });
    });

    it('ignores responses with invalid status so they will be retried', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').resolves({
        message: 'Unknown status',
        status: 999, // invalid status not in STATUS_MAP
        ntc: 0,
        ncell: 0,
        invalid_number: []
      });
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(actual.length).to.equal(0);
      });
    });

    it('handles empty response', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').resolves(null);
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(actual.length).to.equal(0);
      });
    });

    it('sends multiple messages sequentially', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').resolves(SUCCESS_RESPONSE);
      const given = [
        { id: 'a', to: '+9779876543210', content: 'hello' },
        { id: 'b', to: '+9779876543211', content: 'world' }
      ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(2);
        chai.expect(actual).to.deep.equal([
          {
            messageId: 'a',
            state: 'sent',
            details: 'Processed'
          },
          {
            messageId: 'b',
            state: 'sent',
            details: 'Processed'
          }
        ]);
        chai.expect(request.post.args[0][0].body.mobile).to.equal('9876543210');
        chai.expect(request.post.args[0][0].body.message).to.equal('hello');
        chai.expect(request.post.args[1][0].body.mobile).to.equal('9876543211');
        chai.expect(request.post.args[1][0].body.message).to.equal('world');
      });
    });

  });

});
