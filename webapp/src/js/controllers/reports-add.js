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
    Geolocation,
    LineageModelGenerator,
    Snackbar,
    XmlForm
  ) {

    'ngInject';
    'use strict';

    var geolocation;

    var getSelected = function() {
      if ($state.params.formId) { // adding
        Geolocation()
          .then(function(position) {
            geolocation = position;
          })
          .catch($log.warn);

        return $q.resolve({
          formInternalId: $state.params.formId
        });
      }
      if ($state.params.reportId) { // editing
        return LineageModelGenerator.report($state.params.reportId, { merge: true })
          .then(function(result) {
            return {
              doc: result.doc,
              formInternalId: result.doc && result.doc.form
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
        .then(FileReader.utf8);
    };

    var markFormEdited = function() {
      $scope.enketoStatus.edited = true;
    };

    getSelected()
      .then(function(model) {
        $log.debug('setting selected', model);
        $scope.setSelected(model);
        return $q.all([
          getReportContent(model.doc),
          XmlForm(model.formInternalId, { include_docs: true })
        ]).then(function(results) {
          $scope.enketoStatus.edited = false;
          Enketo.render('#report-form', results[1].id, results[0], markFormEdited)
            .then(function(form) {
              $scope.form = form;
              $scope.loadingContent = false;
            })
            .then(function() {
              if (!model.doc || !model.doc._id) {
                return;
              }
              return $q.all($('#report-form input[type=file]')
                .map(function() {
                  var $this = $(this);
                  var attachmentName = 'user-file' + $this.attr('name');

                  return DB().getAttachment(model.doc._id, attachmentName)
                    .then(FileReader.base64)
                    .then(function(base64) {
                      var $picker = $this.closest('.question')
                        .find('.widget.file-picker');

                      $picker.find('.file-feedback').empty();

                      var $preview = $picker.find('.file-preview');
                      $preview.empty();
                      $preview.append('<img src="data:' + base64 + '">');
                    });
                }));
            })
            .catch(function(err) {
              $scope.errorTranslationKey = err.translationKey || 'error.loading.form';
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
      var model = $scope.selected[0];
      var reportId = model.doc && model.doc._id;
      var formInternalId = model.formInternalId;

      Enketo.save(formInternalId, $scope.form, geolocation, reportId)
        .then(function(docs) {
          $log.debug('saved report and associated docs', docs);
          $scope.enketoStatus.saving = false;
          $translate($state.params.reportId ? 'report.updated' : 'report.created')
            .then(Snackbar);
          $scope.enketoStatus.edited = false;
          $state.go('reports.detail', { id: docs[0]._id });
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
