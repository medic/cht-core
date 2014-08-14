describe('relativeDate filter', function() {

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

  it('should render nothing when no date', function() {
    scope.date = undefined;

    var element = compile('<div ng-bind-html="date | relativeDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('<div></div>');
  });

  it('should render date', function() {

    var format = 'DD MMM YYYY hh:mm:ss';

    inject(function(RememberService) {
      RememberService.dateFormat = format;
    });

    var m = moment().subtract('days', 5);
    scope.date = m.valueOf();

    var element = compile('<div ng-bind-html="date | relativeDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('div').attr('title')).to.equal(m.format(format));
    chai.expect(element.text()).to.equal(m.fromNow());
  });

});
