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
        /* globals EnketoForm, XSLTProcessor */
        var medic_config = {
          app_root:    window.location.protocol + '//' + window.location.host,
          enketo_root: window.location.protocol + '//' + window.location.host + /^\/[^\/]+/.exec(window.location.pathname) + '/_design/medic/static/dist/enketo',
        };

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

                withForm(formName, function(formDocId) {
                  console.log('Searching for media links to process...');
                  $('#edit-report .form-wrapper').find('img,video,audio').each(function(i, e) {
                    var src;
                    e = $(e); src = e.attr('src');
                    console.log('testing: ' + src);
                    if(!(/^jr:\/\//.test(src))) { return; }
                    console.log('should substitute image for ' + src);
                    DB.get().getAttachment(formDocId, src.substring(5)).then(function(imageBlob) {
                      e.attr('src', (window.URL || window.webkitURL).createObjectURL(imageBlob));
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

        var loadForm = function(formInternalId, docId, formInstanceData) {
          if(!processors.html.loaded || !processors.model.loaded) {
            return console.log('[enketo] processors are not ready');
          }

          withForm(formInternalId, function(formDocId, data) {
            var doc = data,
                html = processors.html.processor.transformToDocument(doc),
                model = processors.model.processor.transformToDocument(doc);

            showForm(docId, formInternalId,
                html.documentElement.innerHTML,
                model.documentElement.innerHTML,
                formInstanceData);
          });
        };

        var withForm = function(formInternalId, callback) {
          DB.get().query('medic/forms', {include_docs:true}).then(function(res) {
            // find our form
            _.forEach(res.rows, function(row) {
              var xml = row.doc._attachments.xml;
              if(!xml) { return; }
              DB.get().getAttachment(row.id, 'xml').then(function(xmlBlob) {
                var reader = new FileReader();
                reader.addEventListener('loadend', function() {
                  var xml = reader.result, id;
                  xml = $.parseXML(xml);
                  id = xml.evaluate('/h:html/h:head/*[2]/*[1]/*[1]/@id', xml, document.createNSResolver(xml), XPathResult.ANY_TYPE, null).iterateNext().value;
                  if(id !== formInternalId) { return; }
                  callback(row.id, xml);
                });
                reader.readAsText(xmlBlob);
              });
            });
          }).catch(function(err) {
            console.log('[enketo] failure fetching forms: ' + err);
          });
        };

        var addFormToTable = function(formInternalId, name) {
          $('#available-enketo-forms').append('<tr><td>' + name + '</td>' +
              '<td><button class="btn btn-primary form-loader" onclick="loadXmlFrom(\'' + formInternalId + '\')">load</button></td>' +
              '</tr>');
        };

        window.loadFormFor = function(doc, dataContainerSelecter) {
          var formData = $(dataContainerSelecter).text();
          loadForm(doc.form, doc._id, formData);
        };

        window.loadXmlFrom = function(formInternalId) {
          $('#create-report').modal('hide');
          loadForm(formInternalId);
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
                      xform.getElementsByTagName('name')[0].textContent);
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
    }
  ]);
}());
