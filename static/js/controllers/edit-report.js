var modal = require('../modules/modal');

(function () {
  'use strict';

  angular.module('inboxControllers').controller('EditReportCtrl',
    ['$scope', '$state', '$translate', 'DB', 'DbNameService', 'UpdateFacility', 'Enketo',
    function ($scope, $state, $translate, DB, DbNameService, UpdateFacility, Enketo) {

      $(document).on('hidden.bs.modal', '#edit-report', function() {
        $(this).find('.form-wrapper .container').empty();
        Enketo.unload($scope.enketo_report && $scope.enketo_report.formInstance);
        delete $scope.enketo_report;
      });

      $scope.$root.loadComposer = function() {
        $('#edit-report [name=facility]').select2('val', null);
      };

      $scope.$root.loadFormFor = function(doc) {
        loadForm(doc.form, doc.content, doc._id);
      };

      $scope.$root.loadXmlFrom = function(formInternalId, content) {
        $('#create-report').modal('hide');
        loadForm(formInternalId, content);
        $('#edit-report').modal('show');
      };

      var loadForm = function(formInternalId, formInstanceData, docId) {
        var formWrapper = $('.edit-report-dialog .form-wrapper');

        Enketo.render(formWrapper, formInternalId, formInstanceData)
          .then(function(form) {
            if(!formInstanceData) {
              if($state.includes('contacts') && $state.params.id) {
                var content = $('<' + form.getModel().getXML().children[0].children[0].children[0].nodeName + '>');
                $('<g_patient_id>', { text: $state.params.id }).appendTo(content);
                form.getModel().mergeXml(content[0].outerHTML);
              }
            }

            $scope.enketo_report = {
              formInternalId: formInternalId,
              docId: docId,
              formInstance: form
            };
          })
          .catch(function(err) {
            return console.error('Error loading form.', err);
          });
      };

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
