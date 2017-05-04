var _ = require('underscore');

angular.module('inboxControllers').controller('ContactsEditCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $translate,
    ContactForm,
    ContactSchema,
    DB,
    Enketo,
    EnketoTranslation,
    ExtractLineage,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    $scope.loadingContent = true;
    $scope.setShowContent(true);
    $scope.setCancelTarget(function() {
      $state.go('contacts.detail', { id: $state.params.id || $state.params.parent_id });
    });

    var setTitle = function() {
      var key = '';
      if ($scope.category === 'person') {
        if ($scope.contactId) {
          key = 'contact.type.person.edit';
        } else {
          key = 'contact.type.person.new';
        }
      } else {
        if ($scope.contactId) {
          key = 'contact.type.place.edit';
        } else {
          key = 'contact.type.place.new';
        }
      }
      $translate.onReady().then(function() {
        return $translate(key);
      }).then($scope.setTitle);
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
        return DB().get($state.params.id);
      }
      return $q.resolve();
    };

    var getCategory = function(type) {
      return type === 'person' ? 'person' : 'place';
    };

    var getForm = function(contact) {
      $scope.primaryContact = {};
      $scope.original = contact;
      if (contact) {
        $scope.contact = contact;
        $scope.contactId = contact._id;
        $scope.category = getCategory(contact.type);
        setTitle();
        return ContactForm.forEdit(contact.type, { contact: $scope.dependentPersonSchema });
      }

      $scope.contact = {
        type: $state.params.type,
        parent: $state.params.parent_id
      };

      $scope.category = getCategory($scope.contact.type);
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
      var instanceData = getFormInstanceData();
      if (form.id) {
        return Enketo.render('#contact-form', form.id, instanceData);
      }
      return Enketo.renderFromXmlString('#contact-form', form.xml, instanceData);
    };

    var setEnketoContact = function(formInstance) {
      $scope.enketoContact = {
        type: $scope.contact.type,
        formInstance: formInstance,
        docId: $scope.contactId,
      };
    };

    $scope.unmodifiedSchema = ContactSchema.get();
    $scope.dependentPersonSchema = ContactSchema.get('person');
    delete $scope.dependentPersonSchema.fields.parent;

    getContact()
      .then(function(contact) {
        if (!contact) {
          // adding a new contact, deselect the old one
          $scope.clearSelected();
          $scope.settingSelected();
        }

        return contact;
      })
      .then(getForm)
      .then(renderForm)
      .then(setEnketoContact)
      .then(function() {
        $scope.loadingContent = false;
      })
      .catch(function(err) {
        $scope.loadingContent = false;
        $scope.contentError = true;
        $log.error('Error loading contact form.', err);
      });

    $scope.save = function() {
      if ($scope.enketoStatus.saving) {
        $log.debug('Attempted to call contacts-edit:$scope.save more than once');
        return;
      }

      var form = $scope.enketoContact.formInstance;
      var docId = $scope.enketoContact.docId;
      $scope.enketoStatus.saving = true;
      $scope.enketoStatus.error = null;

      return form.validate()
        .then(function(valid) {
          if(!valid) {
            throw new Error('Validation failed.');
          }

          return save(form, docId)
            .then(function(doc) {
              $log.debug('saved report', doc);
              $scope.enketoStatus.saving = false;
              $translate(docId ? 'contact.updated' : 'contact.created').then(Snackbar);
              $state.go('contacts.detail', { id: doc._id });
            })
            .catch(function(err) {
              $scope.enketoStatus.saving = false;
              $log.error('Error submitting form data', err);
              $translate('Error updating contact').then(function(msg) {
                $scope.enketoStatus.error = msg;
              });
            });
        })
        .catch(function() {
          // validation messages will be displayed for individual fields.
          // That's all we want, really.
          $scope.enketoStatus.saving = false;
          $scope.$apply();
        });
    };

    function save(form, docId) {
      return $q.resolve()
        .then(function() {
          if(docId) {
            return DB().get(docId);
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
            submitted.type = $scope.enketoContact.type;
          }

          return saveDoc(submitted, original, extras, repeated);
        });
    }

    function persist(doc) {
      updateTitle(doc);

      var put;
      if(doc._id) {
        put = DB().put(doc);
      } else {
        doc.reported_date = Date.now();
        put = DB().post(doc);
      }
      return put
        .then(function(response) {
          return DB().get(response.id);
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

              var isChild = extra.parent === 'PARENT' ||
                            (!extra.parent && conf.parent === 'PARENT');
              if (isChild) {
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
              var docId = doc[f];
              if (typeof docId === 'object') {
                docId = doc[f]._id;
              }
              return DB().get(doc[f])
                .then(function(dbFieldValue) {
                  if (f === 'parent') {
                    dbFieldValue = ExtractLineage(dbFieldValue);
                  }
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
        .then(function(doc) {
          if (doc.contact && doc.contact._id) {
            doc.contact = ExtractLineage(doc.contact);
          }
          return doc;
        })
        .then(persist)
        .then(function(doc) {
          var lineage = ExtractLineage(doc);
          return $q
            .all(_.map(children, function(child) {
              child.parent = lineage;
              return DB().put(child);
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
      if (nameFormat) {
        doc.name = nameFormat.replace(/\{\{([^}]+)\}\}/g, function(all, name) {
          return doc[name];
        });
      }
    }

    $scope.$on('$destroy', function() {
      if (!$state.includes('contacts.add')) {
        $scope.setTitle();
        if ($scope.enketoContact && $scope.enketoContact.formInstance) {
          Enketo.unload($scope.enketoContact.formInstance);
        }
      }
    });

  }
);
