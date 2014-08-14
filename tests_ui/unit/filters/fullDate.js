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

    var element = compile('<div ng-bind-html="date | fullDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should render date', function() {

    var format = 'DD MMM YYYY hh:mm:ss';

    inject(function(RememberService) {
      RememberService.dateFormat = format;
    });

    var m = moment().subtract('days', 5);
    scope.date = m.valueOf();

    var element = compile('<div ng-bind-html="date | fullDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('.relative-date-content').text()).to.equal(m.fromNow());
    chai.expect(element.find('.full-date').text()).to.equal(m.format(format));
  });

});
