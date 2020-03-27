describe('fullDate filter', function() {

  'use strict';

  let compile;
  let scope;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('FormatDate', {
        datetime: function() {
          return 'day 0';
        },
        relative: function() {
          return 'sometime';
        }
      });
    });
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  it('should render nothing when no date', function() {
    scope.date = undefined;
    const element = compile('<div ng-bind-html="date | fullDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('');
  });

  it('should render date', function() {
    scope.date = moment().valueOf();
    const element = compile('<div ng-bind-html="date | fullDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('.relative-date-content').text()).to.equal('sometime');
    chai.expect(element.find('.full-date').text()).to.equal('day 0');
  });

});
