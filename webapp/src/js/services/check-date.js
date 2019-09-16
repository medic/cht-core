const A_DATE_IN_THE_PAST = 1454424982000;
const MARGIN_OF_ERROR = 10 * 60 * 1000; // ten minutes

angular.module('inboxServices').factory('CheckDate',
  function(
    $http,
    Modal,
    Telemetry
  ) {
    'use strict';
    'ngInject';

    const showModal = function(model) {
      Modal({
        templateUrl: 'templates/modals/bad_local_date.html',
        controller: 'CheckDateCtrl',
        controllerAs: 'checkDateCtrl',
        model: model
      });
    };

    return function() {
      return $http.head('/api/info?seed=' + Math.random())
        .then(function(response) {
          const timestamp = Date.parse(response.headers('Date'));
          if (isNaN(timestamp)) {
            return;
          }

          const delta = Date.now() - timestamp;
          if (Math.abs(delta) < MARGIN_OF_ERROR) {
            // Date/time differences of less than 10 minutes are not very concerning to us
            return;
          }
          Telemetry.record('client-date-offset', delta);
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
