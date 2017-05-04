angular.module('inboxControllers').controller('ContactsReportCtrl',
  function (
    $log,
    $scope,
    $state,
    $translate,
    DB,
    Enketo,
    Snackbar,
    TranslateFrom,
    XmlForm
  ) {

    'use strict';
    'ngInject';

    var render = function(doc) {
      $scope.setSelected({ doc: doc });
      $scope.setCancelTarget(function() {
        $state.go('contacts.detail', { id: $state.params.id });
      });
      var instanceData = {
        source: 'contact',
        contact: doc,
      };
      return XmlForm($state.params.formId, { include_docs: true })
        .then(function(form) {
          return Enketo
            .render('#contact-report', form.id, instanceData)
            .then(function(formInstance) {
              $scope.setTitle(TranslateFrom(form.doc.title));
              $scope.form = formInstance;
              $scope.loadingForm = false;
            });
        });
    };

    $scope.save = function() {
      if ($scope.enketoStatus.saving) {
        $log.debug('Attempted to call contacts-report:$scope.save more than once');
        return;
      }

      $scope.enketoStatus.saving = true;
      $scope.enketoStatus.error = null;
      Enketo.save($state.params.formId, $scope.form)
        .then(function(docs) {
          $log.debug('saved report and associated docs', docs);
          $scope.enketoStatus.saving = false;
          $translate('report.created').then(Snackbar);
          $state.go('contacts.detail', { id: $state.params.id });
        })
        .catch(function(err) {
          $scope.enketoStatus.saving = false;
          $log.error('Error submitting form data: ', err);
          $translate('error.report.save').then(function(msg) {
            $scope.enketoStatus.error = msg;
          });
        });
    };

    $scope.form = null;
    $scope.loadingForm = true;
    $scope.setRightActionBar();
    $scope.setShowContent(true);
    $scope.setCancelTarget(function() {
      $state.go('contacts.detail', { id: $state.params.id });
    });
    DB()
      .get($state.params.id)
      .then(render)
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
);
