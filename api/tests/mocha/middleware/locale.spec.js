const { expect } = require('chai');
const sinon = require('sinon');

const locale = require('../../../src/middleware/locale');

describe('locale middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {};
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should set accept-language header as req locale', () => {
    req.headers = { 'accept-language': 'something something' };
    locale.getLocale(req, res, next);
    expect(req.locale).to.equal('something something');
    expect(next.callCount).to.equal(1);
    expect(next.args).to.deep.equal([[]]);
  });

  it('should not crash if no headers', () => {
    locale.getLocale(req, res, next);
    expect(req.locale).to.equal(undefined);
    expect(next.callCount).to.equal(1);
    expect(next.args).to.deep.equal([[]]);
  });

  it('should not crash if no language header', () => {
    req.headers = { 'some header': 'something something' };
    locale.getLocale(req, res, next);
    expect(req.locale).to.equal(undefined);
    expect(next.callCount).to.equal(1);
    expect(next.args).to.deep.equal([[]]);
  });
});
