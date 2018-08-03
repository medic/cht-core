describe('number filters', function() {

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

  describe('max digit integer filter', function() {
    it('should render nothing when no number', function() {
      scope.number = undefined;
      var element = compile('<div ng-bind-html="number | integer"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('');
    });
  });

  it('should render nothing when not a number', function() {
    scope.number = 'this is not a number';
    var element = compile('<div ng-bind-html="number | integer"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should parse integers', function() {
    scope.number = 3.14;
    var element = compile('<div ng-bind-html="number | integer"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('3');

    scope.number = -3.14;
    var element1 = compile('<div ng-bind-html="number | integer"></div>')(scope);
    scope.$digest();
    chai.expect(element1.html()).to.equal('-3');
  });

  it('should respect max digits when positive number', function() {
    scope.number = '123456';
    var element1 = compile('<div ng-bind-html="number | integer:something"></div>')(scope);
    scope.$digest();
    chai.expect(element1.html()).to.equal('123456');

    var element2 = compile('<div ng-bind-html="number | integer:0"></div>')(scope);
    scope.$digest();
    chai.expect(element2.html()).to.equal('123456');

    var element3 = compile('<div ng-bind-html="number | integer:-1000"></div>')(scope);
    scope.$digest();
    chai.expect(element3.html()).to.equal('123456');

    var element4 = compile('<div ng-bind-html="number | integer:2"></div>')(scope);
    scope.$digest();
    chai.expect(element4.html()).to.equal('99+');
  });

  it('should display correct positive maximum number', function() {
    scope.number = 123456789;
    var element1 = compile('<div ng-bind-html="number | integer:1"></div>')(scope);
    scope.$digest();
    chai.expect(element1.html()).to.equal('9+');

    var element2 = compile('<div ng-bind-html="number | integer:2"></div>')(scope);
    scope.$digest();
    chai.expect(element2.html()).to.equal('99+');

    var element3 = compile('<div ng-bind-html="number | integer:3"></div>')(scope);
    scope.$digest();
    chai.expect(element3.html()).to.equal('999+');

    var element4 = compile('<div ng-bind-html="number | integer:4"></div>')(scope);
    scope.$digest();
    chai.expect(element4.html()).to.equal('9999+');
  });

  it('should display correct negative maximum number', function() {
    scope.number = -123456789;
    var element1 = compile('<div ng-bind-html="number | integer:1"></div>')(scope);
    scope.$digest();
    chai.expect(element1.html()).to.equal('&lt; -9');

    var element2 = compile('<div ng-bind-html="number | integer:2"></div>')(scope);
    scope.$digest();
    chai.expect(element2.html()).to.equal('&lt; -99');

    var element3 = compile('<div ng-bind-html="number | integer:3"></div>')(scope);
    scope.$digest();
    chai.expect(element3.html()).to.equal('&lt; -999');

    var element4 = compile('<div ng-bind-html="number | integer:4"></div>')(scope);
    scope.$digest();
    chai.expect(element4.html()).to.equal('&lt; -9999');
  });
});
