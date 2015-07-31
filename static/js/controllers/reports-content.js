(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsContentCtrl', 
    ['$scope', '$stateParams', 'MessageState',
    function ($scope, $stateParams, MessageState) {

      $scope.selectMessage($stateParams.id);
      $('.tooltip').remove();

      $scope.canMute = function(group) {
        return MessageState.any(group, 'scheduled');
      };

      $scope.canSchedule = function(group) {
       return MessageState.any(group, 'muted');
      };

      var setMessageState = function(group, from, to) {
        group.loading = true;
        var id = $scope.selected._id;
        var groupNumber = group.rows[0].group;
        MessageState.set(id, groupNumber, from, to).catch(function(err) {
          group.loading = false;
          console.log('Error setting message state', err);
        });
      };

      $scope.mute = function(group) {
        setMessageState(group, 'scheduled', 'muted');
      };

      $scope.schedule = function(group) {
        setMessageState(group, 'muted', 'scheduled');
      };

      setTimeout(function() {
                window.medic_config = {
                  app_root:    window.location.protocol + '//' + window.location.host,
                  db_root:     window.location.protocol + '//' + window.location.host + /^\/[^\/]+/.exec(window.location.pathname),
                  enketo_root: window.location.protocol + '//' + window.location.host + /^\/[^\/]+/.exec(window.location.pathname) + '/_design/medic/static/dist/enketo',
                };

                console.log('Requesting remote script...');
                jQuery.getScript(medic_config.enketo_root + '/js/medic-enketo-offline-SNAPSHOT.min.js', function() {
                  setTimeout(function() {
                    console.log('Script fetched; setting up enketo...');

                    requirejs.config( {
                        shim: {
                            "widget/date/bootstrap3-datepicker/js/bootstrap-datepicker": {
                                deps: [ "jquery" ],
                                exports: "jQuery.fn.datepicker"
                            },
                            "widget/time/bootstrap3-timepicker/js/bootstrap-timepicker": {
                                deps: [ "jquery" ],
                                exports: "jQuery.fn.timepicker"
                            },
                            "leaflet": {
                                exports: "L"
                            }
                        }
                    } );

                    requirejs(['jquery'], function($) {
                      function log(message) {
                        console.log('LOG | ' + message);
                        $('#log .content').append('<pre>' + message + '</p>');
                        while($('#log .content').children().length > 5) {
                            $('#log .content pre:first').remove();
                        }
                      };
                      log('Scripts loaded.');

                      log('Requiring enketo form...');
                      requirejs(['enketo-js/Form'], function(Form) {
                        log('Enketo loaded.');

                        var showForm = function(formName, formHtml, formModel, formData) {
                          var form, formContainer, formWrapper,
                              init = function() {
                                var loadErrors;
                                form = new Form('#form-wrapper form', { modelStr:formModel, instanceStr:formData });
                                loadErrors = form.init();
                                if(loadErrors && loadErrors.length > 0) log('loadErrors = ' + loadErrors.toString());
                              },
                              xformDataAsJsonString = function(xml) {
                                return JSON.stringify({
                                  form: formName,
                                  type: 'data_record',
                                  from: 'user:TODO',
                                  reported_date: Date.now(),
                                  content_type: 'xml',
                                  content: xml,
                                });
                              };

                          log('Adding form to DOM...');
                          formWrapper = $('#form-wrapper');
                          formWrapper.show();
                          formContainer = formWrapper.find('.container');
                          formContainer.empty();

                          formContainer.append(formHtml);

                          log('Attempting to load form with data of type: ' + (typeof formModel));
                          console.log('form:\n' + formModel);
                          init();

                          $('#form-wrapper input[type=submit]').on('click', function() {
                            form.validate();
                            if(form.isValid()) {
                              log('Form content is valid!  Saving and resetting.');
                              var record = xformDataAsJsonString(form.getDataStr()),
                                  validateButton = $('#form-wrapper input[type=submit]');
                              validateButton.prop('disabled', true);
                          console.log('Submitting to db: ' + record);
                          $.ajax({
                            url: medic_config.db_root,
                            type: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                                data: record,
                            complete: function() {
                                validateButton.prop('disabled', false); },
                            error: function(req, status, err) {
                                log('Error submitting form data: ' + err); },
                            success: function() { form.resetView(); init(); },
                         });
                            } else {
                              log('Form contains errors.  Please correct them.');
                            }
                          });

                          // Hide loading buttons (loading multiple forms without page reloads leads
                          // to some bugs.  Simpler to avoid these for now.
                          $('.btn.form-loader').hide();
                          $('.raw-report-content').hide();
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

                        var loadForm = function(name, url, formInstanceData) {
                          if(!processors.html.loaded || !processors.model.loaded) {
                            return log('Not all processors are loaded yet.');
                          }

                          log('TODO: we should be getting the form from `db`, not an ajax request.');
                          log('Loading form: ' + url + '...');
                          $.ajax(url).done(function(data) {
                            log('Loaded form.');
                            var doc = data,
                                html = processors.html.processor.transformToDocument(doc),
                                model = processors.model.processor.transformToDocument(doc);

                            console.log('XML');
                            console.log('---');
                            console.log(new XMLSerializer().serializeToString(model));

                            console.log('XML');
                            console.log('---');
                            console.log(new XMLSerializer().serializeToString(html));

                            showForm(name,
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
                            }
                          };
                          return medic_config.app_root + '/api/v1/forms/' + fileName() + '.xml';
                        };

                        window.loadFormFor = function(dataContainerSelecter) {
                          var formData = $(dataContainerSelecter).text(),
                              xml = $.parseXML(formData),
                              formId = xml.evaluate('//./@id', xml).iterateNext().value, // FIXME this code gets the `id` attribute of the root element.  But it sure is ugly.
                              url = getFormUrl(formId);
                          console.log('Should load from ' + url);
                          loadForm(formId, url, formData);
                        };
                      });
                    });

                    (function() {
                      // init load button
                      var btn = $('.btn.form-loader').on('click', function() {
                        loadFormFor( '.raw-report-content p');
                      });
                    }());
                  }, 1000);
                });
      }, 1000);
    }
  ]);

}());
