const { expect } = require('chai');
const sinon = require('sinon');

const cookie = require('../../../src/services/cookie');
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

  it('should set locale cookie as req locale', () => {
    sinon.stub(cookie, 'get').returns('the locale cookie');
    locale.getLocale(req, res, next);
    expect(req.locale).to.equal('the locale cookie');
    expect(next.callCount).to.equal(1);
    expect(next.args).to.deep.equal([[]]);
  });

  it('should prioritize localoe cookie over accepts header', () => {
    sinon.stub(cookie, 'get').returns('en, us');
    req.headers = { 'accept-language': 'something something' };
    locale.getLocale(req, res, next);
    expect(req.locale).to.equal('en, us');
    expect(next.callCount).to.equal(1);
    expect(next.args).to.deep.equal([[]]);
  });

  it('should set accept-language header as req locale when no cookie is available', () => {
    req.headers = { 'accept-language': 'something something' };
    locale.getLocale(req, res, next);
    expect(req.locale).to.equal('something something');
    expect(next.callCount).to.equal(1);
    expect(next.args).to.deep.equal([[]]);
  });

  it('should set accept-language header as req locale when locale cookie is empty', () => {
    sinon.stub(cookie, 'get').returns('');
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
