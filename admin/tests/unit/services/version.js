describe('version', () => {
  let service;

  beforeEach(() => {
    module('adminApp');
    inject(_Version_ => service = _Version_);
  });

  describe('Minimum next release', () => {

    it('A branch has no minimum next release', () => {
      chai.expect(service.minimumNextRelease('a-branch-name')).to.deep.equal({});
    });

    it('A beta returns the beta incremented by one', () => {
      chai.expect(service.minimumNextRelease('1.2.3-beta.0')).to.deep.equal({
        major: 1,
        minor: 2,
        patch: 3,
        beta: 1
      });
      chai.expect(service.minimumNextRelease('1.2.3-beta.1')).to.deep.equal({
        major: 1,
        minor: 2,
        patch: 3,
        beta: 2
      });
      chai.expect(service.minimumNextRelease('1.2.3-beta.9')).to.deep.equal({
        major: 1,
        minor: 2,
        patch: 3,
        beta: 10
      });
      chai.expect(service.minimumNextRelease('1.2.3-beta.10')).to.deep.equal({
        major: 1,
        minor: 2,
        patch: 3,
        beta: 11
      });
    });

    it('A release returns the patch incremented by one', () => {
      chai.expect(service.minimumNextRelease('1.2.0')).to.deep.equal({
        major: 1,
        minor: 2,
        patch: 1
      });
      chai.expect(service.minimumNextRelease('1.2.1')).to.deep.equal({
        major: 1,
        minor: 2,
        patch: 2
      });
      chai.expect(service.minimumNextRelease('1.2.9')).to.deep.equal({
        major: 1,
        minor: 2,
        patch: 10
      });
      chai.expect(service.minimumNextRelease('1.2.10')).to.deep.equal({
        major: 1,
        minor: 2,
        patch: 11
      });
    });
  });
});
