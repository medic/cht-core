(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');
  inboxControllers.controller('ContactsEditCtrl', [
    '$log', '$scope', '$state', '$q', '$translate', 'ContactForm', 'ContactSchema', 'DB', 'Enketo', 'EnketoTranslation', 'UserDistrict', 'Snackbar',
    function ($log, $scope, $state, $q, $translate, ContactForm, ContactSchema, DB, Enketo, EnketoTranslation, UserDistrict, Snackbar) {

      DB = DB.get();

      $scope.loadingContent = true;
      $scope.loadingTypes = true;
      $scope.setShowContent(true);
      $scope.showBackButton(false);

      $scope.$on('$destroy', function() {
        if ($scope.enketo_contact && $scope.enketo_contact.formInstance) {
          Enketo.unload($scope.enketo_contact.formInstance);
        }
      });

      var getVisibleLevel = function() {
        return $q(function(resolve, reject) {
          UserDistrict(function(err, facility_id) {
            if (err) {
              return reject(err);
            }
            if (!facility_id) {
              return resolve();
            }
            DB.get(facility_id)
              .then(function(doc) {
                resolve(doc.type);
              })
              .catch(function(err) {
                if (err.status !== 404) {
                  return reject(err);
                }

                // TODO it seems like my user can't access its own facility object.
                // This is likely a local issue, so here's what should happen above.
                resolve('health_center');
              })
              .catch(reject);
          });
        });
      };

      var setupSchemas = function() {
        return getVisibleLevel()
          .then(function(limit) {
            $scope.unmodifiedSchema = ContactSchema.get();
            $scope.contactTypes = Object.keys($scope.unmodifiedSchema);

            $scope.placeSchemas = limit ? ContactSchema.getBelow(limit) : ContactSchema.get();
            $scope.dependentPersonSchema = $scope.placeSchemas.person;
            delete $scope.dependentPersonSchema.fields.parent;
            delete $scope.placeSchemas.person;

            // one schema for person, and at least two place types
            $scope.canCreateDifferentPlaceTypes = Object.keys($scope.placeSchemas).length > 2;
            $scope.loadingTypes = false;
          });
      };

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

      var setTitle = function() {
        var key = [
          'contact.type',
          $scope.category,
          ($scope.contactId ? 'edit' : 'new')
        ].join('.');
        $translate(key).then($scope.setTitle);
      };

      var getFormInstanceData = function() {
        if (!$scope.contact || !$scope.contact.type) {
          return null;
        }
        var result = {};
        result[$scope.contact.type] = $scope.contact;
        return result;
      };

      var getContact = function() {
        if ($state.params.id) {
          return DB.get($state.params.id);
        }
        return $q.resolve();
      };

      var getForm = function(contact) {
        $scope.primaryContact = {};
        $scope.original = contact;
        if (contact) {
          $scope.contact = contact;
          $scope.contactId = contact._id;
          $scope.category = contact.type === 'person' ? 'person' : 'place';
          setTitle();
          return ContactForm.forEdit(contact.type);
        }

        $scope.contact = {};

        if ($state.params.type) {
          $scope.contact.type = $state.params.type;
        } else {
          var placeTypes = Object.keys($scope.placeSchemas);
          if (placeTypes.length === 1) {
            $scope.contact.type = placeTypes[0];
          }
        }

        if ($state.params.parent_id) {
          $scope.contact.parent = $state.params.parent_id;
        }

        $scope.category = $scope.contact.type === 'person' ? 'person' : 'place';
        $scope.contactId = null;
        setTitle();

        if ($scope.contact.type) {
          var extras = $scope.contact.type === 'person' ? null : { contact: $scope.dependentPersonSchema };
          return ContactForm.forCreate($scope.contact.type, extras);
        }
        return $q.resolve();
      };

      var renderForm = function(form) {
        var container = $('#contact-form');
        if (!form) {
          // Disable next and prev buttons
          container.find('.form-footer .btn')
              .filter('.previous-page, .next-page')
              .addClass('disabled');
          return;
        }
        return Enketo.renderFromXmlString(container, form, getFormInstanceData())
          .then(function(form) {
            $scope.enketo_contact = {
              type: $scope.contact.type,
              formInstance: form,
              docId: $scope.contactId,
            };
          });
      };

      setupSchemas()
        .then(getContact)
        .then(getForm)
        .then(renderForm)
        .then(function() {
          $scope.loadingContent = false;
        })
        .catch(function(err) {
          $scope.loadingContent = false;
          $scope.contentError = true;
          $log.error('Error loading contact form.', err);
        });

      $scope.save = function() {
        var form = $scope.enketo_contact.formInstance;
        var docId = $scope.enketo_contact.docId;
        $scope.saving = true;

        return form.validate()
          .then(function(valid) {
            if(!valid) {
              throw new Error('Validation failed.');
            }

            return save(form, docId)
              .then(function(doc) {
                $log.debug('saved report', doc);
                $scope.saving = false;
                $translate(docId ? 'contact.updated' : 'contact.created').then(Snackbar);
                $state.go('contacts.detail', { id: doc._id });
              })
              .catch(function(err) {
                $scope.saving = false;
                $log.error('Error submitting form data: ', err);
              });
          })
          .catch(function() {
            // validation messages will be displayed for individual fields.
            // That's all we want, really.
            $scope.saving = false;
            $scope.$apply();
          });
      };

      function save(form, docId) {
        return $q.resolve()
          .then(function() {
            if(docId) {
              return DB.get(docId);
            }
            return null;
          })
          .then(function(original) {
            var submitted = EnketoTranslation.contactRecordToJs(form.getDataStr());

            var repeated = submitted[2];
            var extras = submitted[1];
            submitted = submitted[0];

            if(original) {
              submitted = $.extend({}, original, submitted);
            } else {
              submitted.type = $scope.enketo_contact.type;
            }

            return saveDoc(submitted, original, extras, repeated);
          });
      }

      function persist(doc) {
        updateTitle(doc);

        var put;
        if(doc._id) {
          put = DB.put(doc);
        } else {
          doc.reported_date = Date.now();
          put = DB.post(doc);
        }
        return put
          .then(function(response) {
            return DB.get(response.id);
          });
      }

      function saveRepeated(repeated) {
        if (!(repeated && repeated.child_data)) {
          return $q.resolve();
        }

        var children = [];
        return $q
          .all(_.map(repeated.child_data, function(child) {
            return persist(child)
              .then(function(savedChild) {
                children.push(savedChild);
              });
          }))
          .then(function() {
            return children;
          });
      }

      function saveExtras(doc, original, extras) {
        var children = [];
        var schema = $scope.unmodifiedSchema[doc.type];

        // sequentially update all dirty db fields
        var result = $q.resolve(doc);
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

                return persist(extra)
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
                return DB.get(doc[f])
                  .then(function(dbFieldValue) {
                    doc[f] = dbFieldValue;
                    return doc;
                  });
              }
              return doc;
            });
          }
        });
        return result
          .then(function(doc) {
            return { doc: doc, children: children };
          });
      }

      function saveDoc(doc, original, extras, repeated) {
        var children;
        return saveRepeated(repeated)
          .then(function(repeatedChildren) {
            children = repeatedChildren || [];
            return saveExtras(doc, original, extras);
          })
          .then(function(res) {
            children = children.concat(res.children);
            return res.doc;
          })
          .then(persist)
          .then(function(doc) {
            return $q
              .all(_.map(children, function(child) {
                child.parent = doc;
                return DB.put(child);
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
