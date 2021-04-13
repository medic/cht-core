const sinon = require('sinon');
const rewire = require('rewire');
const { expect } = require('chai');

const getApiUrl = rewire('../../src/lib/get-api-url');
const userPrompt = rewire('../../src/lib/user-prompt');

describe('get-api-url', () => {
  let error, readline;
  beforeEach(() => {
    error = sinon.stub();
    readline = {
      question: sinon.stub().throws('unexpected'),
      keyInYN: sinon.stub().throws('unexpected'),
    };
    userPrompt.__set__('readline', readline);
    getApiUrl.__set__('error', error);
    getApiUrl.__set__('userPrompt', userPrompt);
  });

  it('multiple destinations yields error', () => {
    const actual = getApiUrl({ local: true, instance: 'demo' });
    expect(error.args[0][0]).to.include('one of these');
    expect(actual).to.eq(false);
  });

  it('no destination yields error', () => {
    const actual = getApiUrl({});
    expect(error.args[0][0]).to.include('one of these');
    expect(actual).to.eq(false);
  });

  describe('--local', () => {
    it('no environment variable has a default', () => {
      const actual = getApiUrl({ local: true });
      expect(actual).to.eq('http://admin:pass@localhost:5988/medic');
    });

    it('use environment variable', () => {
      const actual = getApiUrl({ local: true }, { COUCH_URL: 'http://user:pwd@localhost:5984/db' });
      expect(actual).to.eq('http://user:pwd@localhost:5988/medic');
    });

    it('warn if environment variable targets remote', () => {
      const actual = getApiUrl({ local: true }, { COUCH_URL: 'http://user:pwd@remote:5984/db' });
      expect(error.args[0][0]).to.include('remote');
      expect(actual).to.eq(false);
    });
  });

  describe('--instance', () => {
    it('with default user', () => {
      readline.question.returns('entered');
      const actual = getApiUrl({ instance: 'inst' });
      expect(actual).to.eq('https://admin:entered@inst.medicmobile.org/medic');
    });

    it('with --user', () => {
      readline.question.returns('entered');
      const actual = getApiUrl({ instance: 'inst', user: 'user' });
      expect(actual).to.eq('https://user:entered@inst.medicmobile.org/medic');
    });
  });

  describe('--url', () => {
    it('basic', () => {
      const actual = getApiUrl({ url: 'https://admin:pwd@url.medicmobile.org/' });
      expect(actual).to.eq('https://admin:pwd@url.medicmobile.org/medic');
    });
  });

  describe('parseLocalUrl', () => {
    const parseLocalUrl = getApiUrl.__get__('parseLocalUrl');
    it('basic', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5988/medic').href).to.eq('http://admin:pass@localhost:5988/'));

    it('updates port', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5984/medic').href).to.eq('http://admin:pass@localhost:5988/'));

    it('ignores path', () =>
      expect(parseLocalUrl('http://admin:pass@localhost:5984/foo').href).to.eq('http://admin:pass@localhost:5988/'));
  });
});
