/**
* Is responsible for rendering the task's state, recipient and time ago.
 */
angular.module('inboxDirectives').directive('taskStateWithRecipient',
  function($translate, GetTaskDate) {
    'use strict';
    'ngInject';

    function link(scope) {
      scope.recipient = scope.task && scope.task.messages && scope.task.messages.length && scope.task.messages[0].to;
      scope.recipientContent = $translate.instant('to recipient', { recipient: scope.recipient });
      scope.taskDate = GetTaskDate(scope.task);
    }

    return {
      link: link,
      restrict: 'E',
      templateUrl: 'templates/directives/task-state-with-recipient.html',
      scope: {
        // String.
        recipient: '@',
        // String.
        recipientContent: '@',
        // Object: (required) a task record.
        task: '=',
        // String.
        taskDate: '@',
      }
    };
  }
);
