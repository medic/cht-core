describe('messageField filter', function() {

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

  it('should render nothing when no field', function() {
    scope.field = undefined;

    var element = compile('<div ng-bind-html="field | messageField"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should render label and value', function() {
    scope.field = {
      label: 'hello',
      value: 'world'
    };

    var element = compile('<div ng-bind-html="field | messageField"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('label').text()).to.equal('hello');
    chai.expect(element.find('p').text()).to.equal('world');
  });

  it('should render value as date', function() {

    var format = 'DD MMM YYYY hh:mm:ss';

    inject(function(RememberService) {
      RememberService.dateFormat = format;
    });

    var m = moment().add('months', 6);
    scope.field = {
      label: 'Expected Date',
      value: m.valueOf()
    };

    var element = compile('<div ng-bind-html="field | messageField"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('label').text()).to.equal('Expected Date');
    chai.expect(element.find('p span').attr('title')).to.equal(m.format(format));
    chai.expect(element.find('p span').text()).to.equal(m.fromNow());
  });

});
