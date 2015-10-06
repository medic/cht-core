(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsReportCtrl', 
    ['$scope', '$state', '$log', 'DB', 'Enketo',
    function ($scope, $state, $log, DB, Enketo) {

      var render = function(doc) {
        $scope.setSelected({ doc: doc });
        var instanceData = {};
        if (doc.type === 'person') {
          instanceData.patient_id = doc._id;
        } else {
          instanceData.place_id = doc._id;
        }
        return Enketo
          .render($('#contact-report'), $state.params.formId, instanceData)
          .then(function(form) {
            $scope.form = form;
            $scope.loadingForm = false;
          });
      };

      $scope.save = function() {
        $scope.saving = true;
        Enketo.save($state.params.formId, $scope.form)
          .then(function(doc) {
            $log.debug('saved report', doc);
            $scope.saving = false;
            $state.go('contacts.detail', { id: $state.params.id });
          })
          .catch(function(err) {
            $scope.saving = false;
            $log.error('Error submitting form data: ', err);
          });
      };

      $scope.form = null;
      $scope.loadingForm = true;
      $scope.setActionBar();
      DB.get()
        .get($state.params.id)
        .then(render)
        .catch(function(err) {
          $log.error('Error loading form', err);
          $scope.contentError = true;
          $scope.loadingForm = false;
        });

      $scope.$on('$destroy', function() {
        Enketo.unload($scope.form);
      });
    }
  ]);

}());
