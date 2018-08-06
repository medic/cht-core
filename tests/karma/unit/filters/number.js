describe('number filters', () => {

  'use strict';

  let compile,
      scope,
      element;

  beforeEach(() => {
    module('inboxApp');
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  describe('max number integer filter', () => {
    it('should render nothing when no number', function() {
      scope.number = undefined;
      element = compile('<div ng-bind-html="number | integer"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('');
    });

    it('should render nothing when not a number', () => {
      scope.number = 'this is not a number';
      element = compile('<div ng-bind-html="number | integer"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('');
    });

    it('should parse integers', () => {
      scope.number = 3.14;
      element = compile('<div ng-bind-html="number | integer"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('3');

      scope.number = -3.14;
      element = compile('<div ng-bind-html="number | integer"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('-3');
    });

    it('should respect max when positive number', () => {
      scope.number = '123456';
      element = compile('<div ng-bind-html="number | integer:something"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('123456');

      element = compile('<div ng-bind-html="number | integer:0"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('123456');

      element = compile('<div ng-bind-html="number | integer:-1000"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('123456');

      element = compile('<div ng-bind-html="number | integer:99"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('99+');
    });

    it('should display correct positive number', () => {
      scope.number = 5;
      element = compile('<div ng-bind-html="number | integer:9"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('5');

      scope.number = 67;
      element = compile('<div ng-bind-html="number | integer:99"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('67');

      scope.number = 286;
      element = compile('<div ng-bind-html="number | integer:999"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('286');

      scope.number = 1985;
      element = compile('<div ng-bind-html="number | integer:9999"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('1985');
    });

    it('should display correct positive maximum number', () => {
      scope.number = 11;
      element = compile('<div ng-bind-html="number | integer:9"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('9+');

      scope.number = 125;
      element = compile('<div ng-bind-html="number | integer:99"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('99+');

      scope.number = 1987;
      element = compile('<div ng-bind-html="number | integer:999"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('999+');

      scope.number = 98782;
      element = compile('<div ng-bind-html="number | integer:9999"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('9999+');
    });

    it('should display correct negative number', () => {
      scope.number = -123456789;
      element = compile('<div ng-bind-html="number | integer:9"></div>')(scope);
      scope.$digest();
      chai.expect(element.html()).to.equal('-123456789');
    });
  });
});
