var A_DATE_IN_THE_PAST = 1454424982000,
    MARGIN_OF_ERROR = 10 * 60 * 1000; // ten minutes

angular.module('inboxServices').factory('CheckDate',
  function(
    $http,
    Modal
  ) {
    'use strict';
    'ngInject';

    var showModal = function(model) {
      Modal({
        templateUrl: 'templates/modals/bad_local_date.html',
        controller: 'CheckDateCtrl',
        model: model
      });
    };

    return function() {
      return $http.head('/api/info?seed=' + Math.random())
        .then(function(response) {
          var header = response.headers('Date');
          var timestamp = Date.parse(header);

          if (isNaN(timestamp)) {
            return;
          }

          var delta = Math.abs(timestamp - Date.now());
          if (delta < MARGIN_OF_ERROR) {
            // Date/time differences of less than 10 minutes are not very concerning to us
            return;
          }

          showModal({
            reportedLocalDate: new Date(),
            expectedLocalDate: new Date(timestamp)
          });
        })
        .catch(function() {
          // if server request fails, then check date against 2016/02/01, or
          // any more recent date in the past that developers choose to update
          // the check value to.
          if (Date.now() < A_DATE_IN_THE_PAST) {
            showModal({ reportedLocalDate: new Date() });
          }
        });
    };
  }
);
