(function () {
  'use strict';
  angular.module('inboxControllers').controller('EditReportCtrl',
    ['$scope', 'DB',
    function ($scope, DB) {
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
            formName = $scope.report_form.formName,
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

          if($scope.report_form.docId) {
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
                var i, items = $scope.$parent.items;
                for(i=0; i<items.length; ++i) {
                  if(items[i]._id === updatedDoc._id) {
                    items[i] = updatedDoc;
                    break;
                  }
                }
                $scope.$parent.select(updatedDoc._id);
              }
              $submit.prop('disabled', false);
              $('#edit-report').modal('hide');
              form.resetView();
              $('#edit-report .form-wrapper').hide();
            }).catch(function(err) {
              $submit.prop('disabled', false);
              console.log('Error submitting form data: ' + err);
            });
          } else {
            DB.get().get(facilityId).then(function(facility) {
              return DB.get().post({
                content: record,
                fields: recordToJs(record),
                contact: facility,
                form: formName,
                type: 'data_record',
                from: facility? facility.phone: '',
                reported_date: Date.now(),
                content_type: 'xml',
              });
            }).then(function(doc) {
              return DB.get().get(doc.id);
            }).then(function(doc) {
              if($scope.$parent.filterModel.type === 'reports') {
                $scope.$parent.items.unshift(doc);
                $scope.$parent.select(doc._id);
              }
              $submit.prop('disabled', false);
              $('#edit-report').modal('hide');
              form.resetView();
              $('#edit-report .form-wrapper').hide();
            }).catch(function(err) {
              $submit.prop('disabled', false);
              console.log('Error submitting form data: ' + err);
            });
          }
        }
      };

      (function constructor() {
        /* globals define, requirejs, XSLTProcessor */
        var medic_config = {
          app_root:    window.location.protocol + '//' + window.location.host,
          enketo_root: window.location.protocol + '//' + window.location.host + /^\/[^\/]+/.exec(window.location.pathname) + '/_design/medic/static/dist/enketo',
        };

        (function() {
          (function() {
            var showForm = function(docId, formName, formHtml, formModel, formData) {
              var form, formContainer, formWrapper,
                  init = function() {
                    var loadErrors;
                    // TODO check if it's OK to attach to `$scope` like this
                    $scope.report_form = { formName:formName, docId:docId };
                    $scope.report_form.form = form = new EnketoForm('.edit-report-dialog .form-wrapper form', { modelStr:formModel, instanceStr:formData });
                    loadErrors = form.init();
                    if(loadErrors && loadErrors.length) {
                      console.log('[enketo] loadErrors: ' + JSON.stringify(loadErrors));
                    }

                    $('#edit-report .form-wrapper').show();
                  };

              formWrapper = $('.edit-report-dialog .form-wrapper');
              formWrapper.show();
              formContainer = formWrapper.find('.container');
              formContainer.empty();

              formContainer.append(formHtml);

              init();
            };

            var processors = {
              html: { processor:new XSLTProcessor() },
              model: { processor:new XSLTProcessor() } };
            $.get(medic_config.enketo_root + '/forms/openrosa2html5form.xsl').done(function(doc) {
              processors.html.processor.importStylesheet(doc);
              processors.html.loaded = true;
            });
            $.get(medic_config.enketo_root + '/forms/openrosa2xmlmodel.xsl').done(function(doc) {
              processors.model.processor.importStylesheet(doc);
              processors.model.loaded = true;
            });

            var loadForm = function(name, url, docId, formInstanceData) {
              if(!processors.html.loaded || !processors.model.loaded) {
                return console.log('[enketo] processors are not ready');
              }

              $.ajax(url).done(function(data) {
                var doc = data,
                    html = processors.html.processor.transformToDocument(doc),
                    model = processors.model.processor.transformToDocument(doc);

                showForm(docId, name,
                    html.documentElement.innerHTML,
                    model.documentElement.innerHTML,
                    formInstanceData);
              });
            };

            var getFormUrl = function(formId) {
              // TODO we should probably be (i) getting the forms from
              // pouch directly, and (ii) storing the form by `formId`
              // in the db, i.e. dosages.xml should be stored as frm:DSG
              // In that case, this mapping would be unnecessary.  If we
              // really wanted to keep this mapping in the short term,
              // we can get a list of xforms from `api`, parse it, and
              // do this id->filename lookup there.
              var fileName = function() {
                switch(formId) {
                  case 'DSG': return 'dosages';
                  case 'PNT': return 'treatments';
                  case 'PREG': return 'pregnancy';
                  case 'HH': return 'households';
                  case 'EDCD_H01': return 'hospital-survey';
                  case 'V': return 'visit-report';
                }
              };
              return medic_config.app_root + '/api/v1/forms/' + fileName() + '.xml';
            };

            var addFormToTable = function(id, name, url) {
                $('#available-enketo-forms').append('<tr><td>' + name + '</td>' +
                    '<td><button class="btn btn-primary form-loader" onclick="loadXmlFrom(\'' + id + '\', \'' + url + '\')">load</button></td>' +
                    '</tr>');
                };

            window.loadFormFor = function(doc, dataContainerSelecter) {
              var formData = $(dataContainerSelecter).text(),
                  formId = doc.form,
                  url = getFormUrl(formId);
              loadForm(formId, url, doc._id, formData);
            };

            window.loadXmlFrom = function(name, url) {
              $('#create-report').modal('hide');
              loadForm(name, url);
              $('#edit-report').modal('show');
            };

            window.loadComposer = function() {
              (function() {
                var formsVisible = false;
                // TODO not sure why we can't have a fresh table every time, or
                // (1) get the list of forms from a service and (2) store them
                // in `$scope`
                $('.status.loading-forms').show();
                $('#available-enketo-forms').empty();
                $('.status.no-forms').hide();
                $('#edit-report [name=facility]').select2('val', null);

                $.ajax({
                  url: medic_config.app_root + '/api/v1/forms',
                  headers: { 'X-OpenRosa-Version':'1.0' },
                  success: function(xml) {
                    var i, xform,
                        xforms = xml.getElementsByTagName('xform');
                    for(i=0; i<xforms.length; ++i) {
                      xform = xforms[i];
                      addFormToTable(xform.getElementsByTagName('formID')[0].textContent,
                          xform.getElementsByTagName('name')[0].textContent,
                          xform.getElementsByTagName('downloadUrl')[0].textContent);
                    }
                    formsVisible = xforms.length > 0;
                  },
                  complete: function() {
                      $('.loading-forms').hide();
                      if(!formsVisible) { $('.no-forms').show(); }
                  },
                });
              }());
            };
          }());
        }());
      }());
    }
  ]);
}());
