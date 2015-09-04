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
    ['$scope', 'DB', 'DbNameService', 'Enketo',
    function ($scope, DB, DbNameService, Enketo) {

      function recordToJs(record) {
        var i, n, fields = {},
            data = $.parseXML(record).firstChild.childNodes;
        for(i=0; i<data.length; ++i) {
          n = data[i];
          if(n.nodeType !== Node.ELEMENT_NODE ||
              n.nodeName === 'meta') { continue; }
          fields[n.nodeName] = n.textContent;
        }
        return fields;
      }

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
              $submit = $('.edit-report-dialog .btn.submit'),
              contact = null,
              updatedDoc = null;
          $submit.prop('disabled', true);

          if(docId) {
            // update an existing doc.  For convenience, get the latest version
            // and then modify the content.  This will avoid most concurrent
            // edits, but is not ideal.  TODO update write failure to handle
            // concurrent modifications.
            DB.get().get(facilityId).then(function(facility) {
              contact = facility;
              return DB.get().get(docId);
            }).then(function(doc) {
              updatedDoc = doc;
              updatedDoc.content = record;
              updatedDoc.fields = recordToJs(record);
              updatedDoc.contact = contact;
              return DB.get().put(updatedDoc);
            }).then(function() {
              if($scope.$parent.filterModel.type === 'reports') {
                // TODO set selected to `updatedDoc._id`
              }
              $submit.prop('disabled', false);
              $('#edit-report').modal('hide');
              form.resetView();
              $('#edit-report .form-wrapper').hide();
            }).catch(function(err) {
              $submit.prop('disabled', false);
              console.log('[enketo] Error submitting form data: ' + err);
            });
          } else {
            DB.get().get(facilityId).then(function(facility) {
              return DB.get().post({
                content: record,
                fields: recordToJs(record),
                contact: facility,
                form: formInternalId,
                type: 'data_record',
                from: facility? facility.phone: '',
                reported_date: Date.now(),
                content_type: 'xml',
              });
            }).then(function(doc) {
              return DB.get().get(doc.id);
            }).then(function(doc) {
              if($scope.$parent.filterModel.type === 'reports') {
                // TODO set selected to `doc._id`
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
        }
      };

      (function constructor() {
        /* globals EnketoForm */
        var showForm = function(docId, formInternalId, formHtml, formModel, formData) {
          var form, formContainer, formWrapper,
              init = function() {
                var loadErrors;
                // TODO check if it's OK to attach to `$scope` like this
                $scope.report_form = { formInternalId:formInternalId, docId:docId };
                $scope.report_form.form = form = new EnketoForm('.edit-report-dialog .form-wrapper form', { modelStr:formModel, instanceStr:formData });
                loadErrors = form.init();
                if(loadErrors && loadErrors.length) {
                  console.log('[enketo] loadErrors: ' + JSON.stringify(loadErrors));
                }

                $('#edit-report .form-wrapper').show();

                withFormByFormInternalId(formInternalId, function(formDocId) {
                  $('#edit-report .form-wrapper').find('img,video,audio').each(function(i, e) {
                    var src;
                    e = $(e); src = e.attr('src');
                    if(!(/^jr:\/\//.test(src))) { return; }
                    DB.get().getAttachment(formDocId, src.substring(5)).then(function(imageBlob) {
                      var objUrl = (window.URL || window.webkitURL).createObjectURL(imageBlob);
                      objUrls.push(objUrl);
                      e.attr('src', objUrl);
                    }).catch(function(err) {
                      console.log('[enketo] error fetching media file', formDocId, src, err);
                    });
                  });
                });
              };

          formWrapper = $('.edit-report-dialog .form-wrapper');
          formWrapper.show();
          formContainer = formWrapper.find('.container');
          formContainer.empty();

          formContainer.append(formHtml);

          init();
        };

        var loadForm = function(formInternalId, docId, formInstanceData) {
          withFormByFormInternalId(formInternalId, function(formDocId, data) {
            var doc = data,
                transformed = Enketo.transformXml(doc),
                html = transformed.html,
                model = transformed.model;

            showForm(docId, formInternalId, html, model, formInstanceData);
          });
        };

        var withFormByFormInternalId = function(formInternalId, callback) {
          DB.get().query('medic/forms', {include_docs:true}).then(function(res) {
            // find our form
            _.forEach(res.rows, function(row) {
              if(!row.doc._attachments.xml) { return; }
              if(row.doc.internalId !== formInternalId) { return; }
              DB.get().getAttachment(row.id, 'xml').then(function(xmlBlob) {
                var reader = new FileReader();
                reader.addEventListener('loadend', function() {
                  var xml = $.parseXML(reader.result);
                  callback(row.id, xml);
                });
                reader.readAsText(xmlBlob);
              });
            });
          }).catch(function(err) {
            console.log('[enketo] failure fetching forms: ' + err);
          });
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
          (function() {
            $scope.$parent.loading = true;

            $('#edit-report [name=facility]').select2('val', null);

            DB.get().query('medic/forms', {include_docs:true}).then(function(res) {
              $scope.$parent.availableForms = res.rows.filter(function(row) {
                return row.doc._attachments.xml;
              }).map(function(row) {
                return row.doc;
              });

              $scope.$parent.loading = false;
            });
          }());
        };
      }());
    }
  ]);
}());
