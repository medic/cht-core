describe('state filter', function() {

  'use strict';

  var compile,
      scope;

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
      $provide.value('translateFilter', function(key, params) {
        return key + '|' + JSON.stringify(params || {});
      });
    });
    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_.$new();
    });
  });

  it('should render received when no task', function() {
    scope.task = {};

    var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
    scope.$digest();
    chai.expect(element.find('.state').text()).to.equal('state.received|{}');
  });

  it('should render state', function() {
    scope.task = {
      state: 'pending'
    };

    var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
    scope.$digest();
    chai.expect(element.find('.state').text()).to.equal('state.pending|{}');
    chai.expect(element.find('.relative-date').length).to.equal(0);
  });

  it('should render due date', function() {
    scope.task = {
      state: 'scheduled',
      due: moment().valueOf()
    };

    var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
    scope.$digest();
    chai.expect(element.find('.state').text()).to.equal('state.scheduled|{}');
    chai.expect(element.find('.relative-date-content').text()).to.equal('sometime');
    chai.expect(element.find('.relative-date').attr('title')).to.equal('day 0');
  });

  it('should render the recipient', function() {
    scope.task = {
      state: 'scheduled',
      due: moment().valueOf(),
      messages: [ { to: '+64123555555' } ]
    };

    var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
    scope.$digest();
    chai.expect(element.find('.state').text()).to.equal('state.scheduled|{}');
    chai.expect(element.find('.relative-date-content').text()).to.equal('sometime');
    chai.expect(element.find('.relative-date').attr('title')).to.equal('day 0');
    chai.expect(element.find('.recipient').text()).to.equal(' to recipient|{"recipient":"+64123555555"}');
  });

});