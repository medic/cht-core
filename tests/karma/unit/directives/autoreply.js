describe('autoreply directive', function() {
  'use strict';

  var compile;
  var scope;

  var STATE_FAKE = 'some state';
  var MESSAGE_FAKE = 'some message';
  var DATETIME_FORMAT_FAKE = 'datetime format';
  var RELATIVE_FORMAT_FAKE = 'relative format';

  beforeEach(function() {
    module('inboxApp');

    module(function ($provide) {
      $provide.value('FormatDate', {
        datetime: function() {
          return DATETIME_FORMAT_FAKE;
        },
        relative: function() {
          return RELATIVE_FORMAT_FAKE;
        }
      });
    });

    inject(function(_$compile_, _$rootScope_) {
      compile = _$compile_;
      scope = _$rootScope_;
    });
  });

  context('when a task has no state', function() {
    it('renders nothing', function() {
      scope.task = {
        messages: [{}],
        state: undefined
      };
      var element = compile(
        '<autoreply task="task"></autoreply>'
      )(scope);
      scope.$digest();

      var expected = '<!-- ngIf: hasState -->';
      var actual = element.html();

      chai.expect(actual).to.equal(expected);
    });
  });

  context('when a task has a state', function() {
    it('renders a task-state', function () {
      scope.task = {
        messages: [{}],
        state: STATE_FAKE
      };
      var element = compile(
        '<autoreply task="task"></autoreply>'
      )(scope);
      scope.$digest();

      var expected = true;
      var actual = !!element[0].querySelector('task-state');

      chai.expect(actual).to.equal(expected);
    });

    it('renders a span with a title taken from first message', function () {
      scope.task = {
        messages: [{ message: MESSAGE_FAKE }],
        state: STATE_FAKE
      };
      var element = compile(
        '<autoreply task="task"></autoreply>'
      )(scope);
      scope.$digest();

      var expected = MESSAGE_FAKE;
      var actual = element[0].querySelector('.autoreply').title;

      chai.expect(actual).to.equal(expected);
    });

    it('renders a relative-date', function () {
      scope.task = {
        messages: [{}],
        state: STATE_FAKE
      };
      var element = compile(
        '<autoreply task="task"></autoreply>'
      )(scope);
      scope.$digest();

      var expected = true;
      var actual = !!element[0].querySelector('relative-date');

      chai.expect(actual).to.equal(expected);
    });
  });
});
