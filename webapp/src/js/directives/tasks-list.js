angular.module('inboxDirectives').component('mmTasksList', {
  templateUrl: 'templates/directives/tasks_list.html',
  controllerAs: 'tasksListCtrl',
  bindings: {
    error: '<',
    hasTasks: '<',
    loading: '<',
    refreshTaskList: '<',
    tasksDisabled: '<'
  }
});
