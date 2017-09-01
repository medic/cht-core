angular.module('inboxControllers').controller('ContactsReportCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $translate,
    ContactViewModelGenerator,
    DB,
    Enketo,
    Geolocation,
    Snackbar,
    TranslateFrom,
    XmlForm
  ) {

    'use strict';
    'ngInject';

    var geolocation;
    Geolocation()
      .then(function(position) {
        geolocation = position;
      })
      .catch($log);

    var markFormEdited = function() {
      $scope.enketoStatus.edited = true;
    };

    var setCancelTarget = function() {
      $scope.setCancelTarget(function() {
        $state.go('contacts.detail', { id: $state.params.id });
      });
    };

    var setSelected = function(contact) {
      return ContactViewModelGenerator(contact._id)
        .then($scope.setSelected)
        .then(setCancelTarget);
    };

    var render = function(contact) {
      return $q.all([
        setSelected(contact),
        XmlForm($state.params.formId, { include_docs: true })
      ])
        .then(function(results) {
          var form = results[1];
          var instanceData = {
            source: 'contact',
            contact: contact,
          };
          $scope.enketoStatus.edited = false;
          return Enketo
            .render('#contact-report', form.id, instanceData, markFormEdited)
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
      Enketo.save($state.params.formId, $scope.form, geolocation)
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
    setCancelTarget();
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
