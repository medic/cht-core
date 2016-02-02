var inboxServices = angular.module('inboxServices');

var A_DATE_IN_THE_PAST = 1454424982000;

inboxServices.factory('CheckDate', [
  '$http',
  function($http) {
    return function($scope) {
      $http.head('/api/info/?seed=' + Math.random())
        .then(function(response) {
          var header = response.headers('Date');
          var timestamp = Date.parse(header);

          if(isNaN(timestamp)) {
            return;
          }

          var delta = Math.abs(timestamp - Date.now());
          if(delta < 10000) {
            // Date/time differences of less than 10 minutes are not very concerning to us
            return;
          }
          $scope.reportedLocalDate = new Date();
          $scope.expectedLocalDate = new Date(timestamp);
          $('#bad-local-date').modal('show');
        })
        .catch(function() {
          // if server request fails, then check date against 2016/02/01, or
          // any more recent date in the past that developers choose to update
          // the check value to.
          if(Date.now() < A_DATE_IN_THE_PAST) {
            $scope.reportedLocalDate = new Date();
            delete $scope.expectedLocalDate;
            $('#bad-local-date').modal('show');
          }
        });
    };
  }
]);
