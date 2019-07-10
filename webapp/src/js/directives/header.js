angular.module('inboxDirectives').directive('mmHeader', function() {
  return {
    restrict: 'E',
    templateUrl: 'templates/directives/header.html',
    controller: function() {},
    controllerAs: 'headerCtrl',
    bindToController: {
      adminUrl: '<'
    }
  };
});
