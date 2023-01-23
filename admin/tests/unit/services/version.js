const v = (ma, mi, pa, be) => {
  const version = {major: ma, minor: mi, patch: pa};

  if (be !== undefined) {
    version.beta = be;
  }

  return version;
};

describe('version', () => {
  let service;

  beforeEach(() => {
    module('adminApp');
    inject(_Version_ => service = _Version_);
  });

  describe('Minimum next release', () => {

    it('A branch has no minimum next release', () => {
      chai.expect(service.minimumNextRelease('a-branch-name')).to.deep.equal({});
      chai.expect(service.minimumNextRelease('4.2.0-79532-fixit.123')).to.deep.equal({});
    });

    it('A beta returns the beta incremented by one', () => {
      chai.expect(service.minimumNextRelease('1.2.3-beta.0')).to.deep.equal(v(1, 2, 3, 1));
      chai.expect(service.minimumNextRelease('1.2.3-beta.1')).to.deep.equal(v(1, 2, 3, 2));
      chai.expect(service.minimumNextRelease('1.2.3-beta.9')).to.deep.equal(v(1, 2, 3, 10));
      chai.expect(service.minimumNextRelease('1.2.3-beta.10')).to.deep.equal(v(1, 2, 3, 11));
      chai.expect(service.minimumNextRelease('1.2.3-beta.10.5473893')).to.deep.equal(v(1, 2, 3, 11));
    });

    it('A release returns the patch incremented by one', () => {
      chai.expect(service.minimumNextRelease('1.2.0')).to.deep.equal(v(1, 2, 1));
      chai.expect(service.minimumNextRelease('1.2.1')).to.deep.equal(v(1, 2, 2));
      chai.expect(service.minimumNextRelease('1.2.9')).to.deep.equal(v(1, 2, 10));
      chai.expect(service.minimumNextRelease('1.2.10')).to.deep.equal(v(1, 2, 11));
      chai.expect(service.minimumNextRelease('4.2.0.564783567')).to.deep.equal(v(4, 2, 1));
    });
  });

  describe('Parse', () => {
    it('Parses a standard version', () => {
      chai.expect(service.parse('1.2.3')).to.deep.equal(v(1, 2, 3));
      chai.expect(service.parse('1.2.3.123456')).to.deep.equal(v(1, 2, 3));
    });
    it('Parses versions with beta information', () => {
      chai.expect(service.parse('1.2.3-beta.4')).to.deep.equal(v(1, 2, 3, 4));
      chai.expect(service.parse('1.2.3-beta.4.123456')).to.deep.equal(v(1, 2, 3, 4));
    });
    it('Returns undefined if it cannot parse the version', () => {
      chai.expect(service.parse('master')).to.equal(undefined);
      chai.expect(service.parse('1.2.3.4.5')).to.equal(undefined);
      chai.expect(service.parse('1.2.3-unsupported_type.4')).to.equal(undefined);
    });
  });

  describe('Compare', () => {
    it('Correctly compares different standard versions', () => {
      chai.expect(service.compare(v(1, 2, 3), v(3, 2, 1))).to.be.below(0);
      chai.expect(service.compare(v(3, 2, 1), v(1, 2, 3))).to.be.above(0);
      chai.expect(service.compare(v(3, 0, 0), v(3, 0, 0))).to.equal(0);
    });
    it('Correctly compares versions with beta information', () => {
      chai.expect(service.compare(v(1, 0, 0, 5), v(1, 0, 0, 5))).to.equal(0);
      chai.expect(service.compare(v(1, 0, 0, 5), v(1, 0, 0, 4))).to.be.above(0);
      chai.expect(service.compare(v(1, 0, 0, 5), v(1, 0, 0, 6))).to.be.below(0);

      chai.expect(service.compare(v(2, 0, 0, 5), v(1, 0, 0, 4))).to.be.above(0);

      chai.expect(service.compare(v(2, 0, 0), v(2, 0, 0, 1))).to.be.below(0);
      chai.expect(service.compare(v(2, 0, 0, 1), v(2, 0, 0))).to.be.above(0);
    });
  });

  describe('currentVersion', () => {
    it('Returns the current version of the app', () => {
      const deploy_info = {
        timestamp: '2022-02-15T08:27:25.997Z',
        user: 'horticulturalist cli',
        version: '1.0.0.123456',
        base_version: '1.0.0'
      };
      chai.expect(service.currentVersion(deploy_info)).to.deep.equal(v(1,  0,  0));
    });
    it('returns the base_version if it is defined', () => {
      const deploy_info = {
        timestamp: '2022-02-15T08:27:25.997Z',
        user: 'horticulturalist cli',
        base_version: '1.0.0'
      };
      chai.expect(service.currentVersion(deploy_info)).to.deep.equal(v(1, 0, 0));
    });
  });
});
