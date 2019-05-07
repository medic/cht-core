angular.module('inboxDirectives').component('mmTasksList', {
  templateUrl: 'templates/directives/tasks_list.html',
  bindings: {
    error: '<',
    hasTasks: '<',
    loading: '<',
    refreshTaskList: '<',
    tasksDisabled: '<'
  }
});
