var modal = require('../modules/modal');

/**
 * EditReportCtrl
 *
 * This controller is used for editing non-enketo Reports.
 */

(function () {
  'use strict';

  angular.module('inboxControllers').controller('EditReportCtrl',
    function (
      $scope,
      $translate,
      Enketo,
      UpdateFacility
    ) {

      'ngInject';

      $(document).on('hidden.bs.modal', '#edit-report', function() {
        $(this).find('.form-wrapper .container').empty();
        Enketo.unload($scope.enketo_report && $scope.enketo_report.formInstance);
        delete $scope.enketo_report;
      });

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
  );
}());
