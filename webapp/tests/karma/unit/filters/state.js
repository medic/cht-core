describe('state filter', () => {

  'use strict';

  let compile;
  let scope;
  let $translate;

  beforeEach(() => {
    module('inboxApp');
    module($provide => {
      $provide.value('FormatDate', {
        datetime: date => 'datetime: ' + date.valueOf(),
        relative: date => 'relative: ' + date.valueOf()
      });
    });
    inject((_$compile_, _$rootScope_, _$translate_) => {
      compile = _$compile_;
      scope = _$rootScope_.$new();
      $translate = _$translate_;
    });
  });

  describe('renders state', () => {

    it('when no task', () => {
      scope.task = {};
      const expected = 'reçu';
      sinon.stub($translate, 'instant').withArgs('state.received').returns(expected);
      const element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.state').text()).to.equal(expected);
    });

    it('when task', () => {
      scope.task = {
        state: 'pending'
      };
      const expected = 'en attente';
      sinon.stub($translate, 'instant').withArgs('state.pending').returns(expected);
      const element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.state').text()).to.equal(expected);
    });

  });

  describe('renders dates', () => {

    it('when no state history', () => {
      scope.task = {
        state: 'unknown',
        due: 1
      };

      const element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.relative-date-content').text()).to.equal('relative: 1');
      chai.expect(element.find('.relative-date').attr('title')).to.equal('datetime: 1');
    });

    it('when scheduled', () => {
      scope.task = {
        state: 'scheduled',
        due: 1
      };

      const element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.relative-date-content').text()).to.equal('relative: 1');
      chai.expect(element.find('.relative-date').attr('title')).to.equal('datetime: 1');
    });

    it('when scheduled with history', () => {
      scope.task = {
        state: 'scheduled',
        state_history: [ { state: 'scheduled', timestamp: 2 } ],
        due: 1
      };

      const element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.relative-date-content').text()).to.equal('relative: 1');
      chai.expect(element.find('.relative-date').attr('title')).to.equal('datetime: 1');
    });

    it('when state history', () => {
      scope.task = {
        state: 'unknown',
        state_history: [ { timestamp: 2 } ],
        due: 1
      };

      const element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      chai.expect(element.find('.relative-date-content').text()).to.equal('relative: 2');
      chai.expect(element.find('.relative-date').attr('title')).to.equal('datetime: 2');
    });

  });

  describe('renders recipients', () => {

    it('when to', () => {
      scope.task = {
        state: 'scheduled',
        due: 1,
        messages: [ { to: '+64123555555' } ]
      };
      const expected = 'au +64123555555';
      sinon.stub($translate, 'instant').withArgs('to recipient', { recipient: '+64123555555' }).returns(expected);
      const element = compile('<span class="task-state" ng-bind-html="task | state"></span>')(scope);
      scope.$digest();
      const nonbreakingSpace = ' '; // this is not a space character...
      chai.expect(element.find('.recipient').text()).to.equal(nonbreakingSpace + expected);
    });

  });

});
