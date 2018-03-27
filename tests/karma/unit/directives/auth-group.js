describe('auth-group directive', () => {

  'use strict';

  let compile,
      scope,
      Auth;

  beforeEach(() => {
    module('inboxApp');
    module('inboxDirectives');
    Auth = sinon.stub();
    module(($provide) => {
      $provide.value('Auth', Auth);
    });
    inject((_$compile_, _$rootScope_) => {
      compile = _$compile_;
      scope = _$rootScope_;
    });
  });

  it('should be hidden with empty parameter or false parameter(s)', (done) => {
    const element = compile('<a mm-auth-group="">')(scope);
    const element2 = compile('<a mm-auth-group="false">')(scope);
    const element3 = compile('<a mm-auth-group="[false, false, false]">')(scope);
    scope.$digest();
    setTimeout(() => {
      chai.expect(element.hasClass('hidden')).to.equal(true);
      chai.expect(element2.hasClass('hidden')).to.equal(true);
      chai.expect(element3.hasClass('hidden')).to.equal(true);
      chai.expect(Auth.callCount).to.equal(0);
      done();
    });
  });

  it('should be shown with true parameter(s)', (done) => {
    const element = compile('<a mm-auth-group="true">')(scope);
    const element2 = compile('<a mm-auth-group="[false, false, true, false, true]">')(scope);
    scope.$digest();
    setTimeout(() => {
      chai.expect(element.hasClass('hidden')).to.equal(false);
      chai.expect(element2.hasClass('hidden')).to.equal(false);
      chai.expect(Auth.callCount).to.equal(0);
      done();
    });
  });

  it('should be shown with at least one allowed permission', (done) => {
    const element = compile('<a mm-auth-group="[\'perm1\', \'perm2\']">')(scope);
    Auth.withArgs('perm1').returns(Promise.resolve());
    Auth.withArgs('perm2').returns(Promise.reject());

    scope.$digest();
    setTimeout(() => {
      chai.expect(element.hasClass('hidden')).to.equal(false);
      chai.expect(Auth.callCount).to.equal(2);
      chai.expect(Auth.args[0][0]).to.equal('perm1');
      chai.expect(Auth.args[1][0]).to.equal('perm2');
      done();
    });
  });

  it('should be hidden with no allowed permissions', (done) => {
    const element = compile('<a mm-auth-group="[\'perm1\', \'perm2\']">')(scope);
    Auth.returns(Promise.reject());
    scope.$digest();
    setTimeout(() => {
      chai.expect(element.hasClass('hidden')).to.equal(true);
      chai.expect(Auth.callCount).to.equal(2);
      chai.expect(Auth.args[0][0]).to.equal('perm1');
      chai.expect(Auth.args[1][0]).to.equal('perm2');
      done();
    });
  });

  it('should work with stacked permissions', (done) => {
    const element = compile('<a mm-auth-group="[[\'a\', \'b\'], [[\'c\', \'d\']], [[[\'e\', \'f\']]], \'g\']">')(scope);
    Auth.withArgs(['a', 'b']).returns(Promise.reject());
    Auth.withArgs(['c', 'd']).returns(Promise.resolve());
    Auth.withArgs(['e', 'f']).returns(Promise.reject());
    Auth.withArgs('g').returns(Promise.reject());
    scope.$digest();

    setTimeout(() => {
      chai.expect(element.hasClass('hidden')).to.equal(false);
      chai.expect(Auth.callCount).to.equal(4);
      chai.expect(Auth.args[0][0]).to.deep.equal(['a', 'b']);
      chai.expect(Auth.args[1][0]).to.deep.equal(['c', 'd']);
      chai.expect(Auth.args[2][0]).to.deep.equal(['e', 'f']);
      chai.expect(Auth.args[3][0]).to.deep.equal('g');
      done();
    });
  });

  it('should work with expressions ', (done) => {
    const element = compile('<a mm-auth-group="[true && [\'a\', \'b\'], false && [\'c\', \'d\'], \'f\']">')(scope);
    Auth.withArgs(['a', 'b']).returns(Promise.reject());
    Auth.withArgs('f').returns(Promise.reject());
    scope.$digest();

    setTimeout(() => {
      chai.expect(element.hasClass('hidden')).to.equal(true);
      chai.expect(Auth.callCount).to.equal(2);
      chai.expect(Auth.args[0][0]).to.deep.equal(['a', 'b']);
      chai.expect(Auth.args[1][0]).to.deep.equal('f');
      done();
    });
  });
});
