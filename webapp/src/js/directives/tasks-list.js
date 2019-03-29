angular.module('inboxDirectives').component('mmTasksList', {
  templateUrl: 'templates/partials/tasks_list.html',
  bindings: {
    error: '<',
    hasTasks: '<',
    loading: '<',
    refreshTaskList: '<',
    tasksDisabled: '<'
  }
});
