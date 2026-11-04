const chai = require('chai');
const sinon = require('sinon');
const request = require('@medic/couch-request');
const secureSettings = require('@medic/settings');
const logger = require('@medic/logger');
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
        chai.expect(request.post.args[0][0]).to.not.have.property('simple'); // HTTP errors must keep throwing
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
            details: {
              code: 422,
              reason: 'UnprocessableContent',
              error: '{"mobile":["The mobile format is invalid."]}'
            }
          }
          // Note: no entry for 'c' because 500 errors have retry: true flag
        ]);
      });
    });

    it('retries 401 unauthorized errors, since a rotated or expired key is account-level', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('invalid-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').rejects(INVALID_CREDENTIALS_ERROR);
      sinon.stub(logger, 'warn');
      sinon.stub(logger, 'error');
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(logger.error.callCount).to.equal(0);
        chai.expect(logger.warn.callCount).to.equal(1);
        chai.expect(logger.warn.args[0].join(' ')).to.include('message a');
        chai.expect(logger.warn.args[0].join(' ')).to.include('Invalid credentials');
      });
    });

    it('ignores unknown errors so they will be retried', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').rejects(new Error('Network timeout'));
      sinon.stub(logger, 'error');
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(actual.length).to.equal(0);
        const logged = logger.error.args.map(args => args.join(' '));
        chai.expect(logged.some(line => line.includes('message a') && line.includes('Network timeout')))
          .to.equal(true);
      });
    });

    it('fails a response with an unknown status and records the body', () => {
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
        chai.expect(actual).to.deep.equal([{
          messageId: 'a',
          state: 'failed',
          details: {
            code: 200,
            reason: 'InvalidResponse',
            error: '{"message":"Unknown status","status":999,"ntc":0,"ncell":0,"invalid_number":[]}'
          }
        }]);
      });
    });

    it('retries an empty response', () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(request, 'post').resolves(null);
      const given = [ { id: 'a', to: '+9779876543210', content: 'hello' } ];
      return service.send(given).then(actual => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(actual).to.deep.equal([]);
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

  describe('gateway error details and retries', () => {

    const gatewayError = (statusCode, body) => ({
      statusCode,
      body,
      message: `${statusCode} - ${JSON.stringify(body)}`
    });

    const send = (...responses) => {
      const post = sinon.stub(request, 'post');
      responses.forEach((response, i) => {
        if (response && response.statusCode) {
          post.onCall(i).rejects(response);
        } else {
          post.onCall(i).resolves(response);
        }
      });
      const given = responses.map((r, i) => ({ id: `msg${i}`, to: '+9779876543210', content: 'hello' }));
      return service.send(given);
    };

    beforeEach(() => {
      sinon.stub(secureSettings, 'getCredentials').resolves('test-api-key');
      sinon.stub(config, 'get').returns({
        nepal_doit_sms: { url: 'https://api.example.com/sms' }
      });
      sinon.stub(logger, 'error');
      sinon.stub(logger, 'warn');
    });

    it('retries a 422 balance error instead of failing the message', () => {
      return send(gatewayError(422, { errors: 'Balance not enough' })).then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(logger.warn.callCount).to.equal(1);
        chai.expect(logger.warn.args[0][0]).to.include('msg0');
        chai.expect(logger.warn.args[0][0]).to.include('Balance not enough');
        chai.expect(logger.error.callCount).to.equal(0);
      });
    });

    it('matches any balance error case-insensitively', () => {
      return send(
        gatewayError(422, { errors: 'Balance Not Enough.' }),
        gatewayError(422, { errors: 'Insufficient BALANCE' })
      ).then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(logger.warn.callCount).to.equal(2);
      });
    });

    it('fails an invalid number and records the gateway error', () => {
      return send(gatewayError(422, { errors: 'Invalid number.' })).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'msg0',
          state: 'failed',
          details: { code: 422, reason: 'UnprocessableContent', error: 'Invalid number.' }
        }]);
      });
    });

    it('reads the gateway error from a JSON text body', () => {
      return send(gatewayError(422, '{"errors":"Invalid number."}')).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'msg0',
          state: 'failed',
          details: { code: 422, reason: 'UnprocessableContent', error: 'Invalid number.' }
        }]);
      });
    });

    it('stores an excerpt of a non-JSON 422 body', () => {
      return send(gatewayError(422, '<html>Bad gateway</html>')).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'msg0',
          state: 'failed',
          details: { code: 422, reason: 'UnprocessableContent', error: '<html>Bad gateway</html>' }
        }]);
      });
    });

    it('stores only the errors field, not other keys of the body', () => {
      const body = '{"errors":"Invalid number.","message":"SECRET SMS","mobile":"patient.phone"}';
      return send(gatewayError(422, body)).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'msg0',
          state: 'failed',
          details: { code: 422, reason: 'UnprocessableContent', error: 'Invalid number.' }
        }]);
      });
    });

    it('truncates long gateway errors to 255 characters', () => {
      return send(gatewayError(422, { errors: 'x'.repeat(300) })).then(actual => {
        chai.expect(actual.length).to.equal(1);
        chai.expect(actual[0].state).to.equal('failed');
        chai.expect(actual[0].details.error).to.equal('x'.repeat(255));
      });
    });

    it('truncates long validation errors and messages to 255 characters', () => {
      const errors = { mobile: [ 'y'.repeat(300) ] };
      return send(gatewayError(422, { errors }), gatewayError(422, { message: 'z'.repeat(300) })).then(actual => {
        chai.expect(actual.length).to.equal(2);
        chai.expect(actual[0].details.error).to.equal(JSON.stringify(errors).slice(0, 255));
        chai.expect(actual[1].details.error).to.equal('z'.repeat(255));
      });
    });

    it('stores a well-formed error when the cut splits a character, whatever the error source', () => {
      // CouchDB rejects the whole batch write for a lone surrogate, so every message in it would be resent
      return send(
        gatewayError(422, { errors: 'Invalid message: ' + 'x'.repeat(237) + '\u{1F600} end' }),
        gatewayError(422, { message: 'x'.repeat(254) + '\u{1F600}' }),
        gatewayError(422, { errors: { mobile: [ 'x'.repeat(242) + '\u{1F600}' ] } })
      ).then(actual => {
        chai.expect(actual.map(change => change.details.error)).to.deep.equal([
          'Invalid message: ' + 'x'.repeat(237) + '\ufffd',
          'x'.repeat(254) + '\ufffd',
          '{"mobile":["' + 'x'.repeat(242) + '\ufffd',
        ]);
        actual.forEach(change => chai.expect(change.details.error.isWellFormed()).to.equal(true));
      });
    });

    it('keeps whole characters and replaces broken ones sent by the gateway', () => {
      return send(
        gatewayError(422, { errors: 'bad \u{1F600} text' }),
        gatewayError(422, { errors: 'bad \ud83d text' })
      ).then(actual => {
        chai.expect(actual.map(change => change.details.error))
          .to.deep.equal([ 'bad \u{1F600} text', 'bad \ufffd text' ]);
      });
    });

    it('classifies the full error, even when the balance text is past the stored length', () => {
      return send(gatewayError(422, { errors: 'x'.repeat(250) + 'Balance not enough' })).then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(logger.warn.callCount).to.equal(1);
      });
    });

    it('retries a balance error sent as JSON text', () => {
      return send(gatewayError(422, '{"errors":"Balance not enough"}')).then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(logger.warn.callCount).to.equal(1);
        chai.expect(logger.warn.args[0][0]).to.include('msg0');
      });
    });

    it('does not retry when the balance text is only in the message field', () => {
      return send(gatewayError(422, { message: 'Balance not enough' })).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'msg0',
          state: 'failed',
          details: { code: 422, reason: 'UnprocessableContent', error: 'Balance not enough' }
        }]);
        chai.expect(logger.warn.callCount).to.equal(0);
      });
    });

    it('does not retry a validation error object that mentions balance', () => {
      return send(gatewayError(422, { errors: { mobile: [ 'Balance not enough' ] } })).then(actual => {
        chai.expect(actual).to.deep.equal([{
          messageId: 'msg0',
          state: 'failed',
          details: { code: 422, reason: 'UnprocessableContent', error: '{"mobile":["Balance not enough"]}' }
        }]);
      });
    });

    it('records the body when a 422 has no error text', () => {
      return send(gatewayError(422, {}), gatewayError(422)).then(actual => {
        chai.expect(actual).to.deep.equal([
          { messageId: 'msg0', state: 'failed', details: { code: 422, reason: 'UnprocessableContent', error: '{}' } },
          {
            messageId: 'msg1',
            state: 'failed',
            details: { code: 422, reason: 'UnprocessableContent', error: 'No response body' }
          }
        ]);
      });
    });

    it('includes the message id in the error log', () => {
      return send(gatewayError(422, { errors: 'Invalid number.' })).then(() => {
        const logged = logger.error.args.map(args => args[0]);
        chai.expect(logged.some(line => line.includes('msg0'))).to.equal(true);
      });
    });

    it('handles a batch with sent, retried and failed messages', () => {
      return send(
        SUCCESS_RESPONSE,
        gatewayError(422, { errors: 'Balance not enough' }),
        gatewayError(422, { errors: 'Invalid number.' })
      ).then(actual => {
        chai.expect(actual).to.deep.equal([
          { messageId: 'msg0', state: 'sent', details: 'Processed' },
          {
            messageId: 'msg2',
            state: 'failed',
            details: { code: 422, reason: 'UnprocessableContent', error: 'Invalid number.' }
          }
        ]);
      });
    });

    it('only applies the balance rule to 422 responses', () => {
      return send(
        gatewayError(500, { errors: 'Balance not enough' }),
        gatewayError(401, { errors: 'Balance not enough' })
      ).then(actual => {
        // neither has an entry: 500 is retried by the existing rule, 401 by the account-level rule
        chai.expect(actual).to.deep.equal([]);
        chai.expect(logger.warn.callCount).to.equal(1);
        chai.expect(logger.warn.args[0].join(' ')).to.include('msg1');
        // the 500 is a plain error; only the 401 is the expected, account-level kind
        chai.expect(logger.error.args.map(args => args.join(' ')).some(line => line.includes('msg0'))).to.equal(true);
        chai.expect(logger.error.args.map(args => args.join(' ')).some(line => line.includes('msg1'))).to.equal(false);
      });
    });


    describe('response classification', () => {

      // the maintainer's live probe of a number on a prefix no operator owns (issue #11438)
      const LIVE_INVALID_NUMBER = {
        message: 'Success! SMS queued !', status: 1, ntc: 0, ncell: 0, invalid_number: [ '9841234567' ]
      };
      const invalidResponse = error => ({ code: 200, reason: 'InvalidResponse', error });
      const loggedWith = (stub, text) => stub.args.some(args => args.some(arg => String(arg).includes(text)));

      it('fails a number the gateway lists as invalid, logging the message id', () => {
        return send(LIVE_INVALID_NUMBER).then(actual => {
          chai.expect(actual).to.deep.equal([{
            messageId: 'msg0',
            state: 'failed',
            details: { code: 200, reason: 'InvalidNumber', error: '["9841234567"]' }
          }]);
          chai.expect(loggedWith(logger.error, 'msg0')).to.equal(true);
          chai.expect(logger.warn.callCount).to.equal(0);
        });
      });

      it('records every listed number, whatever the operator counts say', () => {
        return send(
          { status: 1, ntc: 1, ncell: 0, invalid_number: [ '9841234567', '9800000000' ] }
        ).then(actual => {
          chai.expect(actual).to.deep.equal([{
            messageId: 'msg0',
            state: 'failed',
            details: { code: 200, reason: 'InvalidNumber', error: '["9841234567","9800000000"]' }
          }]);
        });
      });

      it('accepts a status 1 response without an invalid_number array, with a warning', () => {
        const bodies = [
          { message: 'Success! SMS queued !', status: 1 },
          { status: 1, invalid_number: null },
          { status: 1, invalid_number: 'x' },
          { status: 1, invalid_number: {} },
        ];
        return send(...bodies).then(actual => {
          chai.expect(actual).to.deep.equal(bodies.map((body, i) => ({
            messageId: `msg${i}`,
            state: 'sent',
            details: 'Processed',
          })));
          chai.expect(logger.warn.callCount).to.equal(4);
          chai.expect(logger.warn.args.map(args => args.join(' ')).every((line, i) => line.includes(`msg${i}`)))
            .to.equal(true);
          chai.expect(logger.warn.args.every(args => args.join(' ').includes('invalid_number'))).to.equal(true);
        });
      });

      it('accepts a string status 1 under the same rules as the number', () => {
        const bodies = [
          { status: '1', invalid_number: [] },
          { status: '1' },
          { status: '1', invalid_number: null },
          { status: '1', invalid_number: [ '9841234567' ] },
        ];
        return send(...bodies).then(actual => {
          chai.expect(actual).to.deep.equal([
            { messageId: 'msg0', state: 'sent', details: 'Processed' },
            { messageId: 'msg1', state: 'sent', details: 'Processed' },
            { messageId: 'msg2', state: 'sent', details: 'Processed' },
            {
              messageId: 'msg3',
              state: 'failed',
              details: { code: 200, reason: 'InvalidNumber', error: '["9841234567"]' }
            },
          ]);
          chai.expect(logger.warn.callCount).to.equal(2);
          chai.expect(logger.warn.args[0].join(' ')).to.include('msg1');
          chai.expect(logger.warn.args[1].join(' ')).to.include('msg2');
        });
      });

      it('does not warn about a success with an empty invalid_number array', () => {
        return send(SUCCESS_RESPONSE).then(actual => {
          chai.expect(actual).to.deep.equal([ { messageId: 'msg0', state: 'sent', details: 'Processed' } ]);
          chai.expect(logger.warn.callCount).to.equal(0);
        });
      });

      it('fails any other status in a successful response, without mapping it to an HTTP status', () => {
        const bodies = [
          { message: 'SMS(s) sent successfully' },
          { status: 7, invalid_number: [] },
          { status: true, invalid_number: [] },
          { status: ' 1 ', invalid_number: [] },
          { status: 401, invalid_number: [] },
          { status: 422, invalid_number: [] },
          { status: 500, invalid_number: [] },
        ];
        return send(...bodies).then(actual => {
          chai.expect(actual).to.deep.equal(bodies.map((body, i) => ({
            messageId: `msg${i}`,
            state: 'failed',
            details: invalidResponse(JSON.stringify(body)),
          })));
          chai.expect(logger.warn.callCount).to.equal(0);
        });
      });

      it('retries a successful response that is text or empty, logging the id and the body', () => {
        const bodies = [
          [ '<html>ok</html>', '<html>ok</html>' ],
          [ '', 'No response body' ],
          [ null, 'No response body' ],
          [ false, 'false' ],
          [ true, 'true' ],
          [ 0, '0' ],
          [ 123, '123' ],
          [ [], '[]' ],
          [ '{"status":1,"invalid_number":[]}', '{"status":1,"invalid_number":[]}' ],
        ];
        return send(...bodies.map(([ body ]) => body)).then(actual => {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(logger.error.callCount).to.equal(bodies.length);
          logger.error.args.map(args => args.join(' ')).forEach((line, i) => {
            chai.expect(line).to.include(`msg${i}`);
            chai.expect(line).to.include(bodies[i][1]);
          });
          chai.expect(logger.warn.callCount).to.equal(0);
        });
      });

      it('logs a bounded, well-formed excerpt of a retried text body', () => {
        return send('x'.repeat(254) + '\u{1F600}' + 'tail', 'y'.repeat(300)).then(actual => {
          chai.expect(actual).to.deep.equal([]);
          const logged = logger.error.args.map(args => args.join(' '));
          chai.expect(logged.length).to.equal(2);
          chai.expect(logged[0]).to.include('x'.repeat(254) + '\ufffd');
          chai.expect(logged[0]).to.not.include('tail');
          chai.expect(logged[0]).to.not.include('\u{1F600}');
          chai.expect(logged[0].isWellFormed()).to.equal(true);
          chai.expect(logged[1]).to.include('y'.repeat(255));
          chai.expect(logged[1]).to.not.include('y'.repeat(256));
        });
      });

      it('keeps recorded response bodies bounded and well-formed', () => {
        const numbers = Array.from({ length: 30 }, (_, i) => `98410000${String(i).padStart(2, '0')}`);
        return send(
          { status: 7, note: 'x'.repeat(234) + '\u{1F600}' },
          { status: 1, invalid_number: numbers }
        ).then(actual => {
          const cut = '{"status":7,"note":"' + 'x'.repeat(234) + '\ufffd';
          chai.expect(actual[0].details).to.deep.equal(invalidResponse(cut));
          chai.expect(actual[0].details.error.isWellFormed()).to.equal(true);
          chai.expect(actual[1].details).to.deep.equal({
            code: 200,
            reason: 'InvalidNumber',
            error: JSON.stringify(numbers).slice(0, 255),
          });
        });
      });

      it('keeps 422 text excerpts bounded and well-formed', () => {
        const text = 'x'.repeat(254) + '\u{1F600}';
        return send(gatewayError(422, text), gatewayError(422, 'bad \ud83d text')).then(actual => {
          chai.expect(actual.map(change => change.details)).to.deep.equal([
            { code: 422, reason: 'UnprocessableContent', error: 'x'.repeat(254) + '\ufffd' },
            { code: 422, reason: 'UnprocessableContent', error: 'bad \ufffd text' },
          ]);
          actual.forEach(change => chai.expect(change.details.error.isWellFormed()).to.equal(true));
        });
      });

      it('only lists invalid numbers when the status is exactly 1', () => {
        const bodies = [
          { invalid_number: [ '9841234567' ] },
          { status: 7, invalid_number: [ '9841234567' ] },
        ];
        return send(...bodies).then(actual => {
          chai.expect(actual.map(change => change.details)).to.deep.equal(
            bodies.map(body => invalidResponse(JSON.stringify(body)))
          );
        });
      });

      it('retries a 401 whatever its body', () => {
        return send(
          gatewayError(401, {}),
          gatewayError(401),
          gatewayError(401, '<html>401</html>'),
          gatewayError(401, { message: 'Unauthenticated.' })
        ).then(actual => {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(logger.error.callCount).to.equal(0);
          chai.expect(logger.warn.callCount).to.equal(4);
          chai.expect(logger.warn.args[0].join(' ')).to.include('{}');
          chai.expect(logger.warn.args[1].join(' ')).to.include('No response body');
          chai.expect(logger.warn.args[2].join(' ')).to.include('<html>401</html>');
          chai.expect(logger.warn.args.some(args => args.join(' ').includes('undefined'))).to.equal(false);
          chai.expect(logger.warn.args[3].join(' ')).to.include('Unauthenticated.');
        });
      });

      it('keeps invalid numbers and 422 body excerpts well-formed at the cut', () => {
        return send(
          { status: 1, invalid_number: [ 'x'.repeat(252) + '\u{1F600}' ] },
          gatewayError(422, { note: 'x'.repeat(245) + '\u{1F600}' })
        ).then(actual => {
          chai.expect(actual.map(change => change.details)).to.deep.equal([
            { code: 200, reason: 'InvalidNumber', error: '["' + 'x'.repeat(252) + '\ufffd' },
            { code: 422, reason: 'UnprocessableContent', error: '{"note":"' + 'x'.repeat(245) + '\ufffd' },
          ]);
          actual.forEach(change => chai.expect(change.details.error.isWellFormed()).to.equal(true));
        });
      });

      it('still retries a response that could not be parsed', () => {
        const post = sinon.stub(request, 'post');
        post.onCall(0).resolves(SUCCESS_RESPONSE);
        post.onCall(1).rejects(new SyntaxError('Unexpected end of JSON input'));
        const given = [
          { id: 'msg0', to: '+9779876543210', content: 'hello' },
          { id: 'msg1', to: '+9779876543210', content: 'hello' },
        ];
        return service.send(given).then(actual => {
          chai.expect(actual).to.deep.equal([ { messageId: 'msg0', state: 'sent', details: 'Processed' } ]);
          chai.expect(loggedWith(logger.error, 'msg1')).to.equal(true);
          chai.expect(loggedWith(logger.error, 'Unexpected end of JSON input')).to.equal(true);
        });
      });

      it('still retries a 504 gateway page, logging it as an error', () => {
        return send(gatewayError(504, '<html>504 Gateway Time-out</html>')).then(actual => {
          chai.expect(actual).to.deep.equal([]);
          chai.expect(loggedWith(logger.error, 'msg0')).to.equal(true);
          chai.expect(loggedWith(logger.error, '504')).to.equal(true);
          chai.expect(logger.warn.callCount).to.equal(0);
        });
      });

    });

  });

});
