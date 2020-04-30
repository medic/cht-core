describe('relativeDate filter', () => {

  'use strict';

  let compile;
  let scope;

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      $provide.value('FormatDate', {
        datetime: () => 'day 0',
        relative: () => 'somerelativetime',
        time: () => 'sometime'
      });
    });
    inject((_$compile_, _$rootScope_) => {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  it('should render nothing when no date', () => {
    scope.date = undefined;
    const element = compile('<div ng-bind-html="date | relativeDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('<span></span>');
  });

  it('should render date', () => {
    //                   some time in the past
    scope.date = moment('2017-10-10T10:10:10.100').valueOf();
    const element = compile('<div ng-bind-html="date | relativeDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('span').attr('title')).to.equal('day 0');
    chai.expect(element.text()).to.equal('somerelativetime');
  });

  it('should render a time when the date is today', () => {
    //           today
    scope.date = moment().valueOf();
    const element = compile('<div ng-bind-html="date | relativeDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('span').attr('title')).to.equal('day 0');
    chai.expect(element.text()).to.equal('sometime');
  });

  it('should render a date in the future', () => {
    scope.date = moment().add(2, 'days').valueOf();
    const element = compile('<div ng-bind-html="date | relativeDate"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('span').attr('class')).to.equal('relative-date future');
    chai.expect(element.text()).to.equal('somerelativetime');
  });

});
