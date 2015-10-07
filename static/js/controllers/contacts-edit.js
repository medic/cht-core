(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');
  inboxControllers.controller('ContactsEditCtrl', [
    '$log', '$scope', '$state', '$q', 'ContactForm', 'ContactSchema', 'DB', 'Enketo', 'EnketoTranslation', 'UserDistrict',
    function ($log, $scope, $state, $q, ContactForm, ContactSchema, DB, Enketo, EnketoTranslation, UserDistrict) {

      $scope.loadingContent = true;
      $scope.loadingTypes = true;

      function setupSchemas(limit) {
        $scope.unmodifiedSchema = ContactSchema.get();
        $scope.contactTypes = Object.keys($scope.unmodifiedSchema);

        $scope.placeSchemas = limit ? ContactSchema.getBelow(limit) : ContactSchema.get();

        $scope.dependentPersonSchema = $scope.placeSchemas.person;
        delete $scope.dependentPersonSchema.fields.parent;
        delete $scope.placeSchemas.person;

        $scope.canCreateDifferentPlaceTypes = Object.keys($scope.placeSchemas).length > 1;
        $scope.loadingTypes = false;
      }

      // Delete place schemas which are too high in the hierarchy for this user
      // to see
      UserDistrict(function(err, facility_id) {
        if (err) {
          return console.err(err);
        }
        if (!facility_id) {
          // user not tied to a facility can create any kind of place
          setupSchemas();
          return;
        }
        DB.get().get(facility_id)
          .then(function(doc) {
            setupSchemas(doc.type);
          })
          .catch(function(err) {
            if (err.status !== 404) {
              return console.err(err);
            }

            // TODO it seems like my user can't access its own facility object.
            // This is likely a local issue, so here's what should happen above.
            setupSchemas('health_center');
          })
          .catch(console.error.bind(console));
      });

      $scope.setContactType = function(type) {
        $scope.loadingContent = true;
        $scope.contact.type = type;

        ContactForm.forCreate(type, { contact:$scope.dependentPersonSchema })
          .then(function(form) {
            return Enketo.renderFromXmlString($('#contact-form'), form);
          })
          .then(function(form) {
            $scope.enketo_contact = {
              type: type,
              formInstance: form,
              docId: type === $scope.contact.type? $scope.contactId: null,
            };
            $scope.loadingContent = false;
          });
      };

      (function init() {
        var withContact = $state.params.id ?
            DB.get().get($state.params.id) :
            $q.resolve();

        withContact
          .then(function(contact) {
            $scope.primaryContact = {};
            $scope.original = contact;

            var form, formInstanceData;

            if (contact) {
              $scope.contact = contact;
              $scope.contactId = contact._id;
              $scope.category = contact.type === 'person' ? 'person' : 'place';
              var fields = Object.keys($scope.unmodifiedSchema[contact.type].fields);
              formInstanceData = EnketoTranslation.jsToFormInstanceData(contact, fields);

              form = ContactForm.forEdit(contact.type);
            } else {
              $scope.contact = {};
              var placeTypes = Object.keys($scope.placeSchemas);
              if (placeTypes.length === 1) {
                $scope.contact.type = placeTypes[0];
              }

              $scope.category = $scope.contact.type === 'person' ? 'person' : 'place';
              $scope.contactId = null;

              if ($scope.contact.type) {
                form = ContactForm.forCreate($scope.contact.type, { contact:$scope.dependentPersonSchema });
              } else {
                form = $q.resolve();
              }
            }

            var container = $('#contact-form');

            form.then(function(form) {
              if (!form) {
                // Disable next and prev buttons
                container.find('.form-footer .btn').addClass('disabled');
                return;
              }
              Enketo.renderFromXmlString(container, form, formInstanceData)
                .then(function(form) {
                  $scope.enketo_contact = {
                    type: $scope.contact.type,
                    formInstance: form,
                    docId: $scope.contactId,
                  };
                });
            })
            .then(function() {
              $scope.loadingContent = false;
            }).catch(function(err) {
              $scope.loadingContent = false;
              $scope.contentError = true;
              $log.error('Error loading contact form.', err);
            });
          });

      }());

      $scope.save = function() {
        var form = $scope.enketo_contact.formInstance;
        var docId = $scope.enketo_contact.docId;

        return form.validate()
          .then(function(valid) {
            if(!valid) {
              // validation messages will be displayed for individual fields.
              // That's all we want, really.
              return;
            }

            return Promise.resolve()
              .then(function() {
                if(docId) {
                  return DB.get().get(docId);
                }
                return null;
              })
              .then(function(original) {
                var submitted = EnketoTranslation.recordToJs(form.getDataStr());
                var extras;
                if(_.isArray(submitted)) {
                  extras = submitted[1];
                  submitted = submitted[0];
                } else {
                  extras = {};
                }
                if(original) {
                  submitted = $.extend({}, original, submitted);
                } else {
                  submitted.type = $scope.enketo_contact.type;
                }

                return saveDoc(submitted, original, extras);
              })
              .then(function(doc) {
                $log.debug('saved report', doc);
                $scope.saving = false;
                $state.go('contacts.detail', { id: doc._id });
              })
              .catch(function(err) {
                $scope.saving = false;
                $log.error('Error submitting form data: ', err);
              });
            });
      };

      function saveDoc(doc, original, extras) {
        var children = [];
        return Promise.resolve()
          .then(function() {
            var schema = $scope.unmodifiedSchema[doc.type];

            // sequentially update all dirty db fields
            var result = Promise.resolve(doc);
            _.each(schema.fields, function(conf, f) {
              var customType = conf.type.match(/^(db|custom):(.*)$/);
              if (customType) {
                result = result.then(function(doc) {
                  if(!doc[f]) {
                    doc[f] = {};
                  } else if(doc[f] === 'NEW') {
                    var extra = extras[f];
                    extra.type = customType[2];
                    extra.reported_date = Date.now();

                    var isChild = extra.parent === 'PARENT';
                    if(isChild) {
                      delete extra.parent;
                    }

                    updateTitle(extra);
                    return DB.get().post(extra)
                      .then(function(response) {
                        return DB.get().get(response.id);
                      })
                      .then(function(newlySavedDoc) {
                        doc[f] = newlySavedDoc;
                        if(isChild) {
                          children.push(newlySavedDoc);
                        }
                        return doc;
                      });
                  } else if(original && original[f] && doc[f] === original[f]._id) {
                    doc[f] = original[f];
                  } else {
                    return DB.get().get(doc[f])
                      .then(function(dbFieldValue) {
                        doc[f] = dbFieldValue;
                        return doc;
                      });
                  }
                  return doc;
                });
              }
            });
            return result;
          })
          .then(function(doc) {
            updateTitle(doc);
            if(doc._id) {
              return DB.get().put(doc);
            } else {
              doc.reported_date = Date.now();
              return DB.get().post(doc);
            }
          })
          .then(function(doc) {
            return DB.get().get(doc.id);
          })
          .then(function(doc) {
            return Promise
              .all(_.map(children, function(child) {
                child.parent = doc;
                return DB.get().put(child);
              }))
              .then(function() {
                return doc;
              });
          });
      }

      function updateTitle(doc) {
        if(!doc) {
          return;
        }
        var nameFormat = $scope.unmodifiedSchema[doc.type].name;
        if(nameFormat) {
          doc.name = nameFormat.replace(/\{\{([^}]+)\}\}/g, function(all, name) {
            return doc[name];
          });
        }
      }

    }
  ]);

}());
