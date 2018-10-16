describe('auth directive', function() {

  'use strict';

  var compile,
      scope,
      Auth;

  beforeEach(function() {
    module('inboxApp');
    module('inboxDirectives');
    Auth = sinon.stub();
    Auth.any = sinon.stub();
    Auth.online = sinon.stub();
    module(function ($provide) {
      $provide.value('Auth', Auth);
      $provide.value('$q', Q);
    });
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_;
    });
  });

  it('should be shown when auth does not error', function(done) {
    Auth.returns(Promise.resolve());
    var element = compile('<a mm-auth="can_do_stuff">')(scope);
    scope.$digest();
    setTimeout(function() {
      chai.expect(element.hasClass('hidden')).to.equal(false);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.deep.equal(['can_do_stuff']);
      done();
    });
  });

  it('should be hidden when auth errors', function(done) {
    Auth.returns(Promise.reject('boom'));
    var element = compile('<a mm-auth="can_do_stuff">')(scope);
    scope.$digest();
    setTimeout(function() {
      chai.expect(element.hasClass('hidden')).to.equal(true);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.deep.equal(['can_do_stuff']);
      done();
    });
  });

  it('splits comma separated permissions', function(done) {
    Auth.returns(Promise.resolve());
    var element = compile('<a mm-auth="can_do_stuff,!can_not_do_stuff">')(scope);
    scope.$digest();
    setTimeout(function() {
      chai.expect(element.hasClass('hidden')).to.equal(false);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.deep.equal(['can_do_stuff', '!can_not_do_stuff']);
      done();
    });
  });

  describe('mmAuthOnline', () => {
    it('should be shown when auth does not error', (done) => {
      Auth.online.resolves();
      var element = compile('<a mm-auth mm-auth-online="true">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(false);
        chai.expect(Auth.online.callCount).to.equal(1);
        chai.expect(Auth.online.args[0]).to.deep.equal([true]);
        done();
      });
    });

    it('should be hidden when auth errors', (done) => {
      Auth.online.rejects({ some: 'err' });
      var element = compile('<a mm-auth mm-auth-online="false">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(true);
        chai.expect(Auth.online.callCount).to.equal(1);
        chai.expect(Auth.online.args[0]).to.deep.equal([false]);
        done();
      });
    });

    it('parses the attribute value', (done) => {
      Auth.online.resolves();
      var element = compile('<a mm-auth mm-auth-online="1 + 2 + 3">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(false);
        chai.expect(Auth.online.callCount).to.equal(1);
        chai.expect(Auth.online.args[0]).to.deep.equal([6]);
        done();
      });
    });
  });

  describe('mmAuth + mmAuthOnline', () => {
    it('should be shown when both do not err', (done) => {
      Auth.resolves();
      Auth.online.resolves();

      var element = compile('<a mm-auth="permission_to_have" mm-auth-online="true">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(false);
        chai.expect(Auth.online.callCount).to.equal(1);
        chai.expect(Auth.online.args[0]).to.deep.equal([true]);
        chai.expect(Auth.callCount).to.equal(1);
        chai.expect(Auth.args[0][0]).to.deep.equal(['permission_to_have']);
        done();
      });
    });

    it('should be hidden when online succeeds and permissions err', (done) => {
      Auth.rejects();
      Auth.online.resolves();

      var element = compile('<a mm-auth="permission_to_have" mm-auth-online="false">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(true);
        chai.expect(Auth.online.callCount).to.equal(1);
        chai.expect(Auth.online.args[0]).to.deep.equal([false]);
        chai.expect(Auth.callCount).to.equal(1);
        chai.expect(Auth.args[0][0]).to.deep.equal(['permission_to_have']);
        done();
      });
    });

    it('should be hidden when online fails and permissions succeed', (done) => {
      Auth.resolves();
      Auth.online.rejects();

      var element = compile('<a mm-auth="permission_to_have" mm-auth-online="true">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(true);
        chai.expect(Auth.online.callCount).to.equal(1);
        chai.expect(Auth.online.args[0]).to.deep.equal([true]);
        chai.expect(Auth.callCount).to.equal(1);
        chai.expect(Auth.args[0][0]).to.deep.equal(['permission_to_have']);
        done();
      });
    });

    it('should be hidden when both fail', (done) => {
      Auth.rejects();
      Auth.online.rejects();

      var element = compile('<a mm-auth="permission_to_have" mm-auth-online="false">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(true);
        chai.expect(Auth.online.callCount).to.equal(1);
        chai.expect(Auth.online.args[0]).to.deep.equal([false]);
        chai.expect(Auth.callCount).to.equal(1);
        chai.expect(Auth.args[0][0]).to.deep.equal(['permission_to_have']);
        done();
      });
    });
  });

  describe('- any', () => {
    it('should be hidden with false parameter(s)', (done) => {
      const element = compile('<a mm-auth mm-auth-any="false">')(scope);
      const element2 = compile('<a mm-auth mm-auth-any="[false, false, false]">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(true);
        chai.expect(element2.hasClass('hidden')).to.equal(true);
        chai.expect(Auth.any.callCount).to.equal(0);
        done();
      });
    });

    it('should be shown with true parameter(s)', (done) => {
      const element = compile('<a mm-auth mm-auth-any="true">')(scope);
      const element2 = compile('<a mm-auth mm-auth-any="[false, false, true, false, true]">')(scope);
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(false);
        chai.expect(element2.hasClass('hidden')).to.equal(false);
        chai.expect(Auth.any.callCount).to.equal(0);
        done();
      });
    });

    it('should be shown with at least one allowed permission', (done) => {
      const element = compile('<a mm-auth mm-auth-any="[\'perm1\', \'perm2\']">')(scope);
      Auth.any.returns(Promise.resolve());

      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(false);
        chai.expect(Auth.any.callCount).to.equal(1);
        chai.expect(Auth.any.args[0][0]).to.deep.equal([['perm1'], ['perm2']]);
        done();
      });
    });

    it('should be hidden with no allowed permissions', (done) => {
      const element = compile('<a mm-auth mm-auth-any="[\'perm1\', \'perm2\']">')(scope);
      Auth.any.returns(Promise.reject());
      scope.$digest();
      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(true);
        chai.expect(Auth.any.callCount).to.equal(1);
        chai.expect(Auth.any.args[0][0]).to.deep.equal([['perm1'], ['perm2']]);
        done();
      });
    });

    it('should work with stacked permissions', (done) => {
      const element = compile('<a mm-auth mm-auth-any="[[\'a\', \'b\'], [[\'c\', \'d\']], [[[\'e\', \'f\']]], \'g\']">')(scope);
      Auth.any.withArgs([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g']]).returns(Promise.resolve());
      scope.$digest();

      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(false);
        chai.expect(Auth.any.callCount).to.equal(1);
        chai.expect(Auth.any.args[0][0]).to.deep.equal([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g']]);
        done();
      });
    });

    it('should work with expressions ', (done) => {
      const element = compile('<a mm-auth mm-auth-any="[true && [\'a\', \'b\'], false && [\'c\', \'d\'], \'f\']">')(scope);
      Auth.any.withArgs([['a', 'b'], ['f']]).returns(Promise.reject());
      scope.$digest();

      setTimeout(() => {
        chai.expect(element.hasClass('hidden')).to.equal(true);
        chai.expect(Auth.any.callCount).to.equal(1);
        chai.expect(Auth.any.args[0][0]).to.deep.equal([['a', 'b'], ['f']]);
        done();
      });
    });
  });

});
