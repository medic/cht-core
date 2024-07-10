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
    // eslint-disable-next-line no-console
    expect(console.info.args).to.deep.equal([['test']]);
  });

  it('should use winston logger when in node', () => {
    sinon.spy(winston, 'createLogger');
    process.browser = false;

    const logger = rewire('../src/index');

    expect(winston.createLogger.callCount).to.equal(1);
    logger.info('test');
    // eslint-disable-next-line no-console
    expect(console.info.callCount).to.equal(0);
  });

  it('should export date format', () => {
    const logger = rewire('../src/index');
    expect(logger.DATE_FORMAT).to.equal('YYYY-MM-DDTHH:mm:ss.SSS');
  });
});
