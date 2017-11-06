/**
 * Is responsible for rendering the autoreply for a task with relative time.
 */
angular.module('inboxDirectives').directive('autoreply',
  function(FormatDate, $translate, GetTaskDate) {
    'use strict';
    'ngInject';

    function link(scope) {
      scope.title = scope.task.messages[0].message;
      scope.autoreplyContent = $translate.instant('autoreply');
      scope.hasState = scope.task && scope.task.state;
      scope.taskDate = GetTaskDate(scope.task);
    }

    return {
      link: link,
      restrict: 'E',
      templateUrl: 'templates/directives/autoreply.html',
      scope: {
        // String.
        autoreplyContent: '@',
        // Boolean.
        hasState: '@',
        // Object: (required) a task record.
        task: '=',
        // String.
        taskDate: '@',
        // String.
        title: '@',
      }
    };
  }
);
