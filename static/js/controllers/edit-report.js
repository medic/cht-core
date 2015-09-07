(function () {
  'use strict';

  var objUrls = [];
  $(document).on('hidden.bs.modal', '#edit-report', function() {
    var modal = $(this);
    modal.find('.form-wrapper .container').empty();

    // disable buttons for next load
    $('.first-page, .previous-page, .next-page, .last-page').toggleClass('disabled', true);

    // unload blobs
    objUrls.forEach(function(url) {
      (window.URL || window.webkitURL).revokeObjectURL(url);
    });
    objUrls.length = 0;
  });

  angular.module('inboxControllers').controller('EditReportCtrl',
    ['$scope', '$state', 'DB', 'DbNameService', 'Enketo',
    function ($scope, $state, DB, DbNameService, Enketo) {

      $scope.updateReport = function() {
        if(!$scope.report_form) {
          $scope.updateFacility('#edit-report');
          return;
        }
        var form = $scope.report_form.form,
            formInternalId = $scope.report_form.formInternalId,
            docId = $scope.report_form.docId,
            $modal = $('#edit-report'),
            facilityId = $modal.find('[name=facility]').val();
        form.validate();
        if(form.isValid()) {
          var record = form.getDataStr(),
              $submit = $('.edit-report-dialog .btn.submit');
          $submit.prop('disabled', true);

          Enketo.save(formInternalId, record, docId, facilityId).then(function(doc) {
            if (!docId && $state.includes('reports')) {
              // set selected report
              $state.go('reports.detail', { id: doc._id });
            }
            $submit.prop('disabled', false);
            $('#edit-report').modal('hide');
            form.resetView();
            $('#edit-report .form-wrapper').hide();
          }).catch(function(err) {
            $submit.prop('disabled', false);
            console.log('[enketo] Error submitting form data: ' + err);
          });
        }
      };

      $scope.$root.loadFormFor = function(doc) {
        loadForm(doc.form, doc._id, doc.content);
      };

      $scope.$root.loadXmlFrom = function(formInternalId, docId, content) {
        $('#create-report').modal('hide');
        loadForm(formInternalId, docId, content);
        $('#edit-report').modal('show');
      };

      $scope.$root.loadComposer = function() {
        $scope.$parent.loading = true;
        $('#edit-report [name=facility]').select2('val', null);
        Enketo.withAllForms(function(forms) {
          $scope.$parent.availableForms = forms;
          $scope.$parent.loading = false;
        });
      };

      /* globals EnketoForm */
      var showForm = function(docId, formInternalId, formHtml, formModel, formData) {
        var form, formContainer, formWrapper, loadErrors;
        formWrapper = $('.edit-report-dialog .form-wrapper');
        formContainer = formWrapper.find('.container');

        formHtml = $(formHtml);
        replaceJavarosaMediaWithLoaders(formHtml);

        formContainer.empty();
        formContainer.append(formHtml);

        form = new EnketoForm('.edit-report-dialog .form-wrapper form', { modelStr:formModel, instanceStr:formData });
        loadErrors = form.init();
        if(loadErrors && loadErrors.length) {
          return console.log('[enketo] loadErrors: ' + JSON.stringify(loadErrors));
        }

        $scope.report_form = { formInternalId:formInternalId, docId:docId, form:form };

        formWrapper.show();

        Enketo.withFormByFormInternalId(formInternalId, function(formDocId) {
          embedJavarosaMedia(formDocId, formContainer);
        });
      };

      var loadForm = function(formInternalId, docId, formInstanceData) {
        Enketo.withFormByFormInternalId(formInternalId, function(formDocId, doc) {
          var t = Enketo.transformXml(doc);
          showForm(docId, formInternalId, t.html, t.model, formInstanceData);
        });
      };

      var replaceJavarosaMediaWithLoaders = function(form) {
        form.find('img,video,audio').each(function(i, e) {
          var src;
          e = $(e); src = e.attr('src');
          if(!(/^jr:\/\//.test(src))) { return; }
          // Change URL to fragment to prevent browser trying to load it
          e.attr('src', '#'+src);
          e.css('visibility', 'hidden');
          e.wrap('<div class="loader">');
        });
      };

      var embedJavarosaMedia = function(formDocId, formContainer) {
        formContainer.find('img,video,audio').each(function(i, e) {
          var src;
          e = $(e); src = e.attr('src');
          if(!(/^#jr:\/\//.test(src))) { return; }
          DB.get().getAttachment(formDocId, src.substring(6)).then(function(blob) {
            var objUrl = (window.URL || window.webkitURL).createObjectURL(blob);
            objUrls.push(objUrl);
            e.attr('src', objUrl);
            e.css('visibility', '');
            e.unwrap();
          }).catch(function(err) {
            console.log('[enketo] error fetching media file', formDocId, src, err);
          });
        });
      };
    }
  ]);
}());
