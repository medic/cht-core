(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsReportCtrl', 
    ['$scope', '$state', '$log', '$translate', 'DB', 'Enketo', 'TranslateFrom', 'Snackbar',
    function ($scope, $state, $log, $translate, DB, Enketo, TranslateFrom, Snackbar) {

      var render = function(doc) {
        $scope.setSelected({ doc: doc });
        $scope.setCancelTarget(function() {
          $state.go('contacts.detail', { id: $state.params.id });
        });
        var instanceData = {
          source: 'contact',
          contact: doc,
        };
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
            $translate('report.created').then(Snackbar);
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
      $scope.setShowContent(true);
      $scope.setCancelTarget(function() {
        $state.go('contacts.detail', { id: $state.params.id });
      });
      DB()
        .get($state.params.id)
        .then(render)
        .then(function() {
          return DB().query('medic-client/forms', { include_docs: true, key: $state.params.formId });
        })
        .then(function(res) {
          if (res.rows[0]) {
            $scope.setTitle(TranslateFrom(res.rows[0].doc.title));
          }
        })
        .catch(function(err) {
          $log.error('Error loading form', err);
          $scope.contentError = true;
          $scope.loadingForm = false;
        });

      $scope.$on('$destroy', function() {
        if (!$state.includes('contacts.report')) {
          $scope.setTitle();
          Enketo.unload($scope.form);
        }
      });
    }
  ]);

}());
