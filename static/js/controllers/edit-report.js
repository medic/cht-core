(function () {
  'use strict';
  angular.module('inboxControllers').controller('EditReportCtrl',
    ['$scope', 'DB',
    function ($scope, DB) {
      $scope.updateReport = function() {
        if(!$scope.report_form) {
          $scope.updateFacility('#edit-report');
          return;
        }
        var form = $scope.report_form.form,
            formName = $scope.report_form.formName,
            docId = $scope.report_form.docId,
            $modal = $('#edit-report'),
            facilityId = $modal.find('[name=facility]').val(),
            xformDataAsJson = function(xml) {
              return {
                form: formName,
                type: 'data_record',
                from: 'user:TODO',
                reported_date: Date.now(),
                content_type: 'xml',
                content: xml,
              };
            };
        form.validate();
        if(form.isValid()) {
          var record = xformDataAsJson(form.getDataStr()),
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
              doc.content = record.content;
              doc.contact = contact;
              updatedDoc = doc;
              return DB.get().put(doc);
            }).then(function() {
              $scope.$parent.selected = updatedDoc; // TODO make this run on the parent scope, so things actually get updated
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
                content: record.content,
                contact: facility,
                form: formName,
                type: 'data_record',
                from: facility? facility.phone: '',
                reported_date: Date.now(),
                content_type: 'xml',
              });
            }).then(function(doc) {
              // TODO include doc in left-hand list
              // TODO make this doc selected
              $scope.$parent.selected = doc;
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
        /* globals define, medic_config, requirejs, XSLTProcessor */
        window.medic_config = {
          app_root:    window.location.protocol + '//' + window.location.host,
          db_root:     window.location.protocol + '//' + window.location.host + /^\/[^\/]+/.exec(window.location.pathname),
          db_name:     /^\/[^\/]+/.exec(window.location.pathname),
          enketo_root: window.location.protocol + '//' + window.location.host + /^\/[^\/]+/.exec(window.location.pathname) + '/_design/medic/static/dist/enketo',
        };

        jQuery.getScript(medic_config.enketo_root + '/js/medic-enketo-offline-SNAPSHOT.min.js', function() {
            requirejs.config({
              shim: {
                'jquery': {
                  exports: 'jQuery',
                },
                'widget/date/bootstrap3-datepicker/js/bootstrap-datepicker': {
                  deps: [ 'jquery' ],
                  exports: 'jQuery.fn.datepicker',
                },
                'widget/time/bootstrap3-timepicker/js/bootstrap-timepicker': {
                  deps: [ 'jquery' ],
                  exports: 'jQuery.fn.timepicker',
                },
                'leaflet': {
                  exports: 'L',
                },
              }
            });

            define('jquery', function() {
              return jQuery;
            });

            requirejs(['jquery'], function() {
              requirejs(['enketo-js/Form'], function(Form) {
                var showForm = function(docId, formName, formHtml, formModel, formData) {
                  var form, formContainer, formWrapper,
                      init = function() {
                        var loadErrors;
                        // TODO check if it's OK to attach to `$scope` like this
                        $scope.report_form = { formName:formName, docId:docId };
                        $scope.report_form.form = form = new Form('.edit-report-dialog .form-wrapper form', { modelStr:formModel, instanceStr:formData });
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
                    // TODO not sure why we can't have a fresh table
                    // every time, or (1) get the list of forms from
                    // a service and (2) store them in `$scope`
                    $('.status.loading-forms').show();
                    $('#available-enketo-forms').empty();
                    $('.status.no-forms').hide();

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
              });
            });
        });
      }());
    }
  ]);
}());
