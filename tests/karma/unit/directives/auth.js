describe('auth directive', function() {

  'use strict';

  var compile,
      scope,
      Auth;

  beforeEach(function() {
    module('inboxApp');
    module('inboxDirectives');
    Auth = sinon.stub();
    module(function ($provide) {
      $provide.value('Auth', Auth);
    });
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_;
    });
  });

  it('should be shown when auth does not error', function(done) {
    Auth.returns(KarmaUtils.mockPromise());
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
    Auth.returns(KarmaUtils.mockPromise('boom'));
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
    Auth.returns(KarmaUtils.mockPromise());
    var element = compile('<a mm-auth="can_do_stuff,!can_not_do_stuff">')(scope);
    scope.$digest();
    setTimeout(function() {
      chai.expect(element.hasClass('hidden')).to.equal(false);
      chai.expect(Auth.callCount).to.equal(1);
      chai.expect(Auth.args[0][0]).to.deep.equal(['can_do_stuff', '!can_not_do_stuff']);
      done();
    });
  });

});