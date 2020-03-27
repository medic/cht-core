describe('relativeDay filter', function() {

  'use strict';

  let compile;
  let scope;
  const date = sinon.stub();
  const relative = sinon.stub();

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('FormatDate', {
        date: date,
        relative: relative
      });
    });
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  afterEach(function() {
    KarmaUtils.restore(date, relative);
  });

  it('should render nothing when no date', function() {
    scope.date = undefined;
    const element = compile('<div ng-bind-html="date | relativeDay"></div>')(scope);
    scope.$digest();
    chai.expect(element.html()).to.equal('<span></span>');
  });

  it('should render date', function() {
    date.returns('1st Jan 2020');
    relative.returns('in 5 days');
    scope.date = moment().add(5, 'days').valueOf();
    const element = compile('<div ng-bind-html="date | relativeDay"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('span').attr('title')).to.equal('1st Jan 2020');
    chai.expect(element.text()).to.equal('in 5 days');
  });

  it('should render "today"', function() {
    date.returns('1st Jan 2020');
    relative.returns('today');
    scope.date = moment().valueOf();
    const element = compile('<div ng-bind-html="date | relativeDay"></div>')(scope);
    scope.$digest();
    chai.expect(element.find('span').attr('title')).to.equal('1st Jan 2020');
    chai.expect(element.text()).to.equal('today');
  });

});
