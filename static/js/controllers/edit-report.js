var modal = require('../modules/modal');

(function () {
  'use strict';

  angular.module('inboxControllers').controller('EditReportCtrl',
    ['$scope', '$translate', 'UpdateFacility',
    function ($scope, $translate, UpdateFacility) {

      $scope.saveReport = function() {
        var $modal = $('#edit-report');
        var docId = $modal.find('[name=id]').val();
        var facilityId = $modal.find('[name=facility]').val();
        if (!docId) {
          $modal.find('.modal-footer .note')
            .text($translate.instant('Error updating facility'));
          return;
        }
        if (!facilityId) {
          $modal.find('.modal-footer .note')
            .text($translate.instant('Please select a facility'));
          return;
        }
        var pane = modal.start($modal);
        UpdateFacility(docId, facilityId, function(err) {
          pane.done($translate.instant('Error updating facility'), err);
        });
      };

    }
  ]);
}());
