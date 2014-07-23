describe('messageType filter', function() {

  'use strict';

  var compile,
      scope;

  beforeEach(module('inboxApp'));

  beforeEach(inject(['$compile', '$rootScope', 
    function($compile, $rootScope) {
      compile = $compile;
      scope = $rootScope.$new();
    }
  ]));

  it('should render nothing when no message', function() {
    scope.forms = [
      { code: 'A', name: 'aye' },
      { code: 'B', name: 'bee' },
      { code: 'C', name: 'sea' }
    ];
    scope.message = undefined;

    var element = compile('<div ng-bind-html="message | messageType:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should render Message when no form', function() {
    scope.forms = [
      { code: 'A', name: 'aye' },
      { code: 'B', name: 'bee' },
      { code: 'C', name: 'sea' }
    ];
    scope.message = {};

    var element = compile('<div ng-bind-html="message | messageType:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('Message');
  });

  it('should render form name when form', function() {
    scope.forms = [
      { code: 'A', name: 'aye' },
      { code: 'B', name: 'bee' },
      { code: 'C', name: 'sea' }
    ];
    scope.message = {
      form: 'B'
    };

    var element = compile('<div ng-bind-html="message | messageType:forms"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('bee');
  });

});