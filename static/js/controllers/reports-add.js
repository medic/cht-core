angular.module('inboxControllers').controller('ReportsAddCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $translate,
    DB,
    Enketo,
    FileReader,
    Snackbar,
    XmlForm
  ) {

    'ngInject';
    'use strict';

    var getSelected = function() {
      if ($state.params.formId) { // adding
        return $q.resolve({
          formInternalId: $state.params.formId
        });
      }
      if ($state.params.reportId) { // editing
        return DB()
          .get($state.params.reportId)
          .then(function(doc) {
            return {
              doc: doc,
              formInternalId: doc.form
            };
          });
      }
      return $q.reject(new Error('Must have either formId or reportId'));
    };

    $scope.loadingContent = true;
    $scope.contentError = false;
    $scope.saving = false;
    if ($state.params.reportId || $state.params.formId) {
      $scope.setCancelTarget(function() {
        // Note : if no $state.params.reportId, goes to "No report selected".
        $state.go('reports.detail', { id: $state.params.reportId });
      });
    } else {
      $scope.clearCancelTarget();
    }

    var getReportContent = function(doc) {
      // creating a new doc - no content
      if (!doc || !doc._id) {
        return $q.resolve();
      }
      // TODO: check doc.content as this is where legacy documents stored
      //       their XML. Consider removing this check at some point in the
      //       future.
      if (doc.content) {
        return $q.resolve(doc.content);
      }
      // check new style attached form content
      return DB().getAttachment(doc._id, Enketo.REPORT_ATTACHMENT_NAME)
        .then(FileReader);
    };

    getSelected()
      .then(function(model) {
        $log.debug('setting selected', model);
        $scope.setSelected(model);
        return $q.all([
          getReportContent(model.doc),
          XmlForm(model.formInternalId, { include_docs: true })
        ]).then(function(results) {
          Enketo.render('#report-form', results[1].id, results[0])
            .then(function(form) {
              $scope.form = form;
              $scope.loadingContent = false;
            })
            .catch(function(err) {
              $scope.loadingContent = false;
              $scope.contentError = true;
              $log.error('Error loading form.', err);
            });
        });
      })
      .catch(function(err) {
        $scope.loadingContent = false;
        $log.error('Error setting selected doc', err);
      });

    $scope.save = function() {
      if ($scope.enketoStatus.saving) {
        $log.debug('Attempted to call reports-add:$scope.save more than once');
        return;
      }

      $scope.enketoStatus.saving = true;
      $scope.enketoStatus.error = null;
      console.log('$scope.selected', $scope.selected);
      var model = $scope.selected[0];
      var reportId = model.doc && model.doc._id;
      var formInternalId = model.formInternalId;
      Enketo.save(formInternalId, $scope.form, reportId)
        .then(function(doc) {
          $log.debug('saved report', doc);
          $scope.enketoStatus.saving = false;
          $translate($state.params.reportId ? 'report.updated' : 'report.created')
            .then(Snackbar);
          $state.go('reports.detail', { id: doc._id });
        })
        .catch(function(err) {
          $scope.enketoStatus.saving = false;
          $log.error('Error submitting form data: ', err);
          $translate('error.report.save').then(function(msg) {
            $scope.enketoStatus.error = msg;
          });
        });
    };

    $scope.$on('$destroy', function() {
      if (!$state.includes('reports.add') && !$state.includes('reports.edit')) {
        Enketo.unload($scope.form);
      }
    });
  }
);
