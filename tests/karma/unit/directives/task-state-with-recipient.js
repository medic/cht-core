describe('taskStateWithRecipient directive', function() {
  'use strict';

  var compile;
  var scope;

  var DATETIME_FORMAT_FAKE = 'datetime format';
  var FAKE_TO = 'some guy';
  var RELATIVE_FORMAT_FAKE = 'relative format';

  beforeEach(function() {
    module('inboxApp');

    module(function($provide) {
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

  context('when a task is passed', function() {
    it('renders a task-state', function() {
      scope.task = {
        messages: [{}],
      };
      var element = compile(
        '<task-state-with-recipient task="task"></task-state-with-recipient>'
      )(scope);
      scope.$digest();

      var expected = true;
      var actual = !!element[0].querySelector('task-state');

      chai.expect(actual).to.equal(expected);
    });

    it('renders a relative-date', function() {
      scope.task = {
        messages: [{}],
      };
      var element = compile(
        '<task-state-with-recipient task="task"></task-state-with-recipient>'
      )(scope);
      scope.$digest();

      var expected = true;
      var actual = !!element[0].querySelector('relative-date');

      chai.expect(actual).to.equal(expected);
    });

    context('when a task has a recipient', function() {
      it('renders a recipient content', function() {
        scope.task = {
          messages: [{to: FAKE_TO}],
        };
        var element = compile(
          '<task-state-with-recipient task="task"></task-state-with-recipient>'
        )(scope);
        scope.$digest();

        var expected = true;
        var actual = !!element[0].querySelector('.recipient');

        chai.expect(actual).to.equal(expected);
      });
    });

    context('when a task has no recipient', function() {
      it('does not render a recipient content', function() {
        scope.task = {
          messages: [{}],
        };
        var element = compile(
          '<task-state-with-recipient task="task"></task-state-with-recipient>'
        )(scope);
        scope.$digest();

        var expected = false;
        var actual = !!element[0].querySelector('.recipient');

        chai.expect(actual).to.equal(expected);
      });
    });
  });
});
