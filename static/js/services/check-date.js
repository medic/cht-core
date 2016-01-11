var inboxServices = angular.module('inboxServices');

inboxServices.factory('CheckDate', [
  function() {
      return function($scope) {
        var requestOptions = {
          type: 'HEAD',
          url: '/api/info/?seed=' + Math.random(),
          async: true,
        };

        $.ajax(requestOptions)
          .done(function(data, status, xhr) {
            // TODO 

            var header = xhr.getResponseHeader('Date');
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
          });
        // TODO if server request fails, then check date against 2016/02/01, or
        // any more recent date in the past that developers choose to update the
        // check value to.
    }
  }
]);
