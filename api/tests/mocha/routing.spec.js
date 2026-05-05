const rewire = require('rewire');
const chai = require('chai');

const normalizeUrl = (url) => {
  const [pathname, ...rest] = url.split('?');
  return pathname.replace(/\/+/g, '/') + (rest.length ? '?' + rest.join('?') : '');
};

describe('Routing', () => {
  before(() => global.angular = {
    module: () => ({
      controller: () => {},
    }),
  });

  after(() => delete global.angular);

  it('Content Security policy build url matches actual', () => {
    const environment = rewire('@medic/environment');
    const adminUpgrade = rewire('./../../../admin/src/js/controllers/upgrade');
    const cspBuildDb = environment.__get__('DEFAULT_BUILDS_URL');
    const actualBuildDb = adminUpgrade.__get__('DEFAULT_BUILDS_URL');
    chai.expect(cspBuildDb).to.not.eq(undefined);
    chai.expect(cspBuildDb).to.include(actualBuildDb);
  });

  describe('URL slash normalization', () => {
    it('should collapse double slashes in pathname', () => {
      chai.expect(normalizeUrl('//some//path')).to.equal('/some/path');
    });

    it('should not modify query parameter values', () => {
      chai.expect(normalizeUrl('/path?redirect=https://example.com/a//b'))
        .to.equal('/path?redirect=https://example.com/a//b');
    });

    it('should handle URLs without query strings', () => {
      chai.expect(normalizeUrl('/some//path')).to.equal('/some/path');
    });

    it('should preserve query params with multiple ? characters', () => {
      chai.expect(normalizeUrl('/path?a=1?2&b=3')).to.equal('/path?a=1?2&b=3');
    });

    it('should handle URL with only pathname', () => {
      chai.expect(normalizeUrl('/clean/path')).to.equal('/clean/path');
    });

    it('should normalize pathname but preserve query with slashes', () => {
      chai.expect(normalizeUrl('//api//v1?url=http://test.com'))
        .to.equal('/api/v1?url=http://test.com');
    });
  });
});
