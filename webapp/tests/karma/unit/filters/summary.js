describe('summary filter', function() {

  'use strict';

  var compile,
      scope;

  beforeEach(function() {
    module('inboxApp');
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  it('should render nothing when no message', function() {
    scope.forms = [
      { code: 'A', title: 'aye' },
      { code: 'B', title: 'bee' },
      { code: 'C', title: 'sea' }
    ];
    scope.message = undefined;

    var element = compile('<div ng-bind-html="message | summary:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should render Message when no form', function() {
    scope.forms = [
      { code: 'A', title: 'aye' },
      { code: 'B', title: 'bee' },
      { code: 'C', title: 'sea' }
    ];
    scope.message = {};

    var element = compile('<div ng-bind-html="message | summary:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('tasks.0.messages.0.message');
  });

  it('should render form title when form', function() {
    scope.forms = [
      { code: 'A', title: 'aye' },
      { code: 'B', title: 'bee' },
      { code: 'C', title: 'sea' }
    ];
    scope.message = {
      form: 'B'
    };

    var element = compile('<div ng-bind-html="message | summary:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('bee');
  });

});