angular.module('inboxDirectives').component('mmSortFilter', {
  templateUrl: 'templates/directives/filters/sort.html',
  bindings: {
    lastVisitedDateExtras: '<',
    sort: '<',
    sortDirection: '<'
  }
});
