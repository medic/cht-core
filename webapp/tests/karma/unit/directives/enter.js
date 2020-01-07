describe('enter directive', function() {

  'use strict';

  let compile;
  let scope;
  let document;

  beforeEach(function () {
    module('inboxApp');
    module('inboxDirectives');
    inject(function(_$compile_, _$rootScope_, $document) {
      compile = _$compile_;
      scope = _$rootScope_;
      document = $document;
    });
    scope.mockFunction = sinon.stub().returns(Promise.resolve());
  });

  it('it should call the mock function on pressing enter', done => {
    compile('<div><a mm-enter="mockFunction()">Test</a></div>')(scope);
    scope.$digest();
    chai.expect(scope.mockFunction.called).to.equal(false);
    document.triggerHandler({ type: 'keydown', which: 13 });

    setTimeout(function() {
      chai.expect(scope.mockFunction.called).to.equal(true);
      done();
    });
  });

  it('it should not call the mock function on pressing any key', done => {
    compile('<div><a mm-enter="mockFunction()">Test</a></div>')(scope);
    scope.$digest();
    chai.expect(scope.mockFunction.called).to.equal(false);
    document.triggerHandler({ type: 'keydown', which: 27 });

    setTimeout(function() {
      chai.expect(scope.mockFunction.called).to.equal(false);
      done();
    });
  });

});
