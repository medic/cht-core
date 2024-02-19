const chai = require('chai');
const sinon = require('sinon');
const request = require('@medic/couch-request');
const secureSettings = require('@medic/settings');
const config = require('../../../src/config');
const service = require('../../../src/services/africas-talking');

const SUCCESS_RESPONSE = JSON.stringify({
  SMSMessageData: {
    Message: 'Sent to 1/1 Total Cost: KES 0.8000',
    Recipients: [{
      statusCode: 101,
      number: '+254711XXXYYY',
      status: 'Success',
      cost: 'KES 0.8000',
      messageId: 'ATPid_SampleTxnId123'
    }]
  }
});

const INVALID_PHONE_NUMBER_RESPONSE = JSON.stringify({
  SMSMessageData: {
    Message: 'Sent to 1/1 Total Cost: KES 0.8000',
    Recipients: [{
      statusCode: 403,
      number: '+254711XXXYYY',
      status: 'InvalidPhoneNumber',
      cost: 'KES 0.8000',
      messageId: 'def'
    }]
  }
});

const INTERNAL_SERVER_ERROR_RESPONSE = JSON.stringify({
  SMSMessageData: {
    Message: 'Sent to 1/1 Total Cost: KES 0.8000',
    Recipients: [{
      statusCode: 500,
      number: '+254711XXXYYY',
      status: 'InternalServerError',
      cost: 'KES 0.8000',
      messageId: 'ghi'
    }]
  }
});

describe('africas talking service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('send', () => {

    it('fails early with bad config', done => {
      sinon.stub(config, 'get').returns({});
      const given = [ { uuid: 'a', to: '+123', content: 'hello' } ];
      service.send(given)
        .then(() => done(new Error('expected error to be thrown')))
        .catch(err => {
          chai.expect(err)
            .to.equal('No username configured. Refer to the Africa\'s Talking configuration documentation.');
          done();
        });
    });

    it('forwards messages to instance', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('555');
      sinon.stub(config, 'get').returns({
        reply_to: '98765',
        africas_talking: { username: 'user' }
      });
      sinon.stub(request, 'post').resolves(SUCCESS_RESPONSE);
      const given = [ { id: 'a', to: '+123', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'a',
          gatewayRef: 'ATPid_SampleTxnId123',
          state: 'sent',
          details: 'Sent'
        }]);
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(request.post.args[0][0].url).to.equal('https://api.africastalking.com/version1/messaging');
        chai.expect(request.post.args[0][0].form.username).to.equal('user');
        chai.expect(request.post.args[0][0].form.from).to.equal('98765');
        chai.expect(request.post.args[0][0].form.to).to.equal('+123');
        chai.expect(request.post.args[0][0].form.message).to.equal('hello');
        chai.expect(request.post.args[0][0].headers.apikey).to.equal('555');
        chai.expect(config.get.callCount).to.equal(1);
        chai.expect(config.get.args[0][0]).to.equal('sms');
        chai.expect(secureSettings.getCredentials.callCount).to.equal(1);
        chai.expect(secureSettings.getCredentials.args[0][0]).to.equal('africastalking.com:outgoing');
      });
    });

    it('forwards messages to sandbox when testing', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('555');
      sinon.stub(config, 'get').returns({
        reply_to: '98765',
        africas_talking: { username: 'sandbox' }
      });
      sinon.stub(request, 'post').resolves(SUCCESS_RESPONSE);
      const given = [ { id: 'a', to: '+123', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'a',
          gatewayRef: 'ATPid_SampleTxnId123',
          state: 'sent',
          details: 'Sent'
        }]);
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(request.post.args[0][0].url).to.equal('https://api.sandbox.africastalking.com/version1/messaging');
        chai.expect(request.post.args[0][0].form.username).to.equal('sandbox');
      });
    });

    it('does not return status update for errors that should be retried', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('555');
      sinon.stub(config, 'get').returns({
        reply_to: '98765',
        africas_talking: { username: 'user' }
      });
      sinon.stub(request, 'post')
        .onCall(0).resolves(SUCCESS_RESPONSE) // success
        .onCall(1).resolves(INVALID_PHONE_NUMBER_RESPONSE) // fatal error
        .onCall(2).resolves(INTERNAL_SERVER_ERROR_RESPONSE); // temporary error - don't update state
      const given = [
        { id: 'a', to: '+123', content: 'hello' },
        { id: 'b', to: '+456', content: 'hello' },
        { id: 'c', to: '+789', content: 'hello' }
      ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(3);
        chai.expect(actual).to.deep.equal([
          {
            messageId: 'a',
            gatewayRef: 'ATPid_SampleTxnId123',
            state: 'sent',
            details: 'Sent'
          },
          {
            messageId: 'b',
            gatewayRef: 'def',
            state: 'failed',
            details: 'InvalidPhoneNumber'
          }
        ]);
      });
    });

    it('an invalid response is ignored so it will be retried', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('555');
      sinon.stub(config, 'get').returns({
        reply_to: '98765',
        africas_talking: { username: 'user' }
      });
      sinon.stub(request, 'post').rejects('Unknown error');
      const given = [ { uuid: 'a', to: '+123', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(actual.length).to.equal(0);
      });
    });

  });

});
