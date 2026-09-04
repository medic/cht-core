const expect = require('chai').expect;
const sinon = require('sinon');
const winston = require('winston');
const rewire = require('rewire');

describe('logger test', () => {
  beforeEach(() => {
    sinon.stub(console, 'info');
  });

  afterEach(() => {
    sinon.restore();
    delete process?.browser;
  });

  it('should use default console when in browser', () => {
    sinon.stub(winston, 'createLogger');
    process.browser = true;

    const logger = rewire('../src/index');
    expect(winston.createLogger.callCount).to.equal(0);
    logger.info('test');
    expect(console.info.args).to.deep.equal([['test']]);
  });

  it('should use winston logger when in node', () => {
    sinon.spy(winston, 'createLogger');
    process.browser = false;

    const logger = rewire('../src/index');

    expect(winston.createLogger.callCount).to.equal(1);
    logger.info('test');
    expect(console.info.callCount).to.equal(0);
  });

  it('should export date format', () => {
    const logger = rewire('../src/index');
    expect(logger.DATE_FORMAT).to.equal('YYYY-MM-DDTHH:mm:ss.SSS');
  });
});

describe('node-logger internals', () => {
  let nodeLogger;

  beforeEach(() => {
    nodeLogger = rewire('../src/node-logger');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('cleanUpErrorsFromSymbolProperties', () => {
    let cleanUpErrorsFromSymbolProperties;

    beforeEach(() => {
      cleanUpErrorsFromSymbolProperties = nodeLogger.__get__('cleanUpErrorsFromSymbolProperties');
    });

    it('returns early when info is falsy', () => {
      cleanUpErrorsFromSymbolProperties(null);
      cleanUpErrorsFromSymbolProperties(undefined);
    });

    it('cleans up request errors in symbol properties', () => {
      const sym = Symbol('splat');
      const requestError = {
        constructor: { name: 'RequestError' },
        options: { uri: 'http://secret', auth: { password: 'pass' } },
        request: { headers: { authorization: 'Bearer token' } },
        response: { body: 'response' },
      };

      const info = { message: 'test', [sym]: [requestError] };
      cleanUpErrorsFromSymbolProperties(info);

      expect(requestError.options).to.be.undefined;
      expect(requestError.request).to.be.undefined;
      expect(requestError.response).to.be.undefined;
    });

    it('skips non-array symbol properties', () => {
      const sym = Symbol('test');
      const info = { message: 'test', [sym]: 'not-an-array' };
      cleanUpErrorsFromSymbolProperties(info);
    });
  });

  describe('cleanUpRequestError', () => {
    let cleanUpRequestError;

    beforeEach(() => {
      cleanUpRequestError = nodeLogger.__get__('cleanUpRequestError');
    });

    it('removes sensitive properties from StatusCodeError', () => {
      const error = {
        constructor: { name: 'StatusCodeError' },
        options: { auth: 'secret' },
        request: { headers: {} },
        response: { body: 'fail' },
      };

      cleanUpRequestError(error);

      expect(error.options).to.be.undefined;
      expect(error.request).to.be.undefined;
      expect(error.response).to.be.undefined;
    });

    it('does nothing for non-request errors', () => {
      const error = new Error('regular error');
      error.options = 'keep';
      cleanUpRequestError(error);
      expect(error.options).to.equal('keep');
    });

    it('does nothing for falsy values', () => {
      cleanUpRequestError(null);
      cleanUpRequestError(undefined);
    });
  });

  describe('create', () => {
    it('defaults to info level when LOG_LEVEL is not set', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;
      const freshLogger = rewire('../src/node-logger');
      const logger = freshLogger.create('YYYY-MM-DD');
      expect(logger).to.be.ok;
      expect(freshLogger.__get__('logLevel')).to.equal('info');
      if (originalLogLevel !== undefined) {
        process.env.LOG_LEVEL = originalLogLevel;
      }
    });

    it('uses LOG_LEVEL when set', () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      const freshLogger = rewire('../src/node-logger');
      const logger = freshLogger.create('YYYY-MM-DD');
      expect(logger).to.be.ok;
      expect(freshLogger.__get__('logLevel')).to.equal('debug');
      if (originalLogLevel !== undefined) {
        process.env.LOG_LEVEL = originalLogLevel;
      } else {
        delete process.env.LOG_LEVEL;
      }
    });
  });

  describe('enumerateErrorFormat', () => {
    let enumerateErrorFormat;

    beforeEach(() => {
      enumerateErrorFormat = nodeLogger.__get__('enumerateErrorFormat');
    });

    it('handles info.message being an Error', () => {
      const transform = enumerateErrorFormat();
      const err = new Error('inner error');
      err.code = 'ERR_TEST';
      const info = { message: err, level: 'error' };

      const result = transform.transform(info);

      expect(result.message.message).to.equal('inner error');
      expect(result.message.stack).to.be.a('string');
      expect(result.message.code).to.equal('ERR_TEST');
    });

    it('handles info being an Error', () => {
      const transform = enumerateErrorFormat();
      const err = new Error('top error');
      err.level = 'error';

      const result = transform.transform(err);

      expect(result.message).to.equal('top error');
      expect(result.stack).to.be.a('string');
    });

    it('passes through regular info objects', () => {
      const transform = enumerateErrorFormat();
      const info = { message: 'hello', level: 'info' };

      const result = transform.transform(info);

      expect(result.message).to.equal('hello');
    });
  });
});
