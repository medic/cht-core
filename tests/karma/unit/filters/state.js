describe('state filter', function() {

  'use strict';

  var compile,
      scope;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('FormatDate', {
        datetime: function(date) {
          return 'datetime: ' + date.valueOf();
        },
        relative: function(date) {
          return 'relative: ' + date.valueOf();
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

  describe('renders state', function() {

    it('when no task', function() {
      scope.task = {};

      var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.state').text()).to.equal('state.received|{}');
    });

    it('when task', function() {
      scope.task = {
        state: 'pending'
      };

      var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.state').text()).to.equal('state.pending|{}');
    });

  });

  describe('renders dates', function() {

    it('when no state history', function() {
      scope.task = {
        state: 'unknown',
        due: 1
      };

      var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.relative-date-content').text()).to.equal('relative: 1');
      chai.expect(element.find('.relative-date').attr('title')).to.equal('datetime: 1');
    });

    it('when scheduled', function() {
      scope.task = {
        state: 'scheduled',
        due: 1
      };

      var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.relative-date-content').text()).to.equal('relative: 1');
      chai.expect(element.find('.relative-date').attr('title')).to.equal('datetime: 1');
    });

    it('when scheduled with history', function() {
      scope.task = {
        state: 'scheduled',
        state_history: [ { state: 'scheduled', timestamp: 2 } ],
        due: 1
      };

      var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.relative-date-content').text()).to.equal('relative: 1');
      chai.expect(element.find('.relative-date').attr('title')).to.equal('datetime: 1');
    });

    it('when state history', function() {
      scope.task = {
        state: 'unknown',
        state_history: [ { timestamp: 2 } ],
        due: 1
      };

      var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.relative-date-content').text()).to.equal('relative: 2');
      chai.expect(element.find('.relative-date').attr('title')).to.equal('datetime: 2');
    });

  });

  describe('renders recipients', function() {

    it('when to', function() {
      scope.task = {
        state: 'scheduled',
        due: 1,
        messages: [ { to: '+64123555555' } ]
      };

      var element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.recipient').text()).to.equal(' to recipient|{"recipient":"+64123555555"}');
    });

  });

});
