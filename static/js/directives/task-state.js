/**
 * Is responsible for rendering the translated task's state.
 */
angular.module('inboxDirectives').directive('taskState',
  function($translate) {
    'use strict';
    'ngInject';

    function link(scope) {
      scope.className = 'state ' + scope.state;
      scope.label = $translate.instant('state.' + scope.state);
    }

    return {
      link: link,
      restrict: 'E',
      templateUrl: 'templates/directives/task-state.html',
      scope: {
        // String.
        className: '@',
        // String.
        label: '@',
        // String: (required) a task's state.
        state: '=',
      }
    };
  }
);
