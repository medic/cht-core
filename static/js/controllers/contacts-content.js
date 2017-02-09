var _ = require('underscore'),
    moment = require('moment');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsContentCtrl',
    function(
      $log,
      $q,
      $scope,
      $stateParams,
      $translate,
      Changes,
      ContactSchema,
      DB,
      Search,
      TasksForContact,
      UserSettings
    ) {

      'ngInject';

      var taskEndDate,
          reportStartDate;

      $scope.filterTasks = function(task) {
        return !taskEndDate || taskEndDate.isAfter(task.date);
      };
      $scope.filterReports = function(report) {
        return !reportStartDate || reportStartDate.isBefore(report.reported_date);
      };

      $scope.setReportsTimeWindowMonths = function(months) {
        $scope.reportsTimeWindowMonths = months;
        reportStartDate = months ? moment().subtract(months, 'months') : null;
      };

      $scope.setTasksTimeWindowWeeks = function(weeks) {
        $scope.tasksTimeWindowWeeks = weeks;
        taskEndDate = weeks ? moment().add(weeks, 'weeks') : null;
      };

      $scope.setTasksTimeWindowWeeks(1);
      $scope.setReportsTimeWindowMonths(3);

      var getHomePlaceId = function() {
        return UserSettings()
          .then(function(user) {
            return user && user.facility_id;
          })
          .catch(function(err) {
            $log.error('Error fetching user settings', err);
          });
      };

      var splitChildren = function(children) {
        return _.groupBy(children, function(child) {
          if (child.doc.type === 'person') {
            return 'persons';
          }
          return 'places';
        });
      };

      var genericSortFn = function(lhs, rhs) {
        if (!lhs.doc.name && !rhs.doc.name) {
          return 0;
        }
        if (!rhs.doc.name) {
          return 1;
        }
        if (!lhs.doc.name) {
          return -1;
        }
        return lhs.doc.name.localeCompare(rhs.doc.name);
      };

      var sortFamilyMembers = function(persons) {
        if (!persons) {
          return;
        }
        persons.sort(function(lhs, rhs) {
          if (lhs.doc.date_of_birth &&
              rhs.doc.date_of_birth &&
              lhs.doc.date_of_birth !== rhs.doc.date_of_birth) {
            return lhs.doc.date_of_birth < rhs.doc.date_of_birth ? -1 : 1;
          }
          if (lhs.doc.date_of_birth && !rhs.doc.date_of_birth) {
            return 1;
          }
          if (!lhs.doc.date_of_birth && rhs.doc.date_of_birth) {
            return -1;
          }
          return genericSortFn(lhs, rhs);
        });
      };

      var sortContacts = function(places) {
        if (!places) {
          return;
        }
        places.sort(genericSortFn);
      };

      var getChildren = function(contactDoc) {
        if (contactDoc.type === 'person') {
          return $q.resolve({ persons: undefined, places: undefined });
        }
        var options = {
          startkey: [ contactDoc._id ],
          endkey: [ contactDoc._id, {} ],
          include_docs: true
        };
        return DB()
          .query('medic-client/contacts_by_parent_name_type', options)
          .then(function(children) {
            var groups = splitChildren(children.rows);
            sortContacts(groups.places);
            sortContacts(groups.persons);
            return groups;
          });
      };

      var selectedSchemaVisibleFields = function(selected) {
        var fields = ContactSchema.getVisibleFields()[selected.doc.type].fields;
        // date of birth is shown already
        delete fields.date_of_birth;
        if (selected.doc.contact &&
            _.findWhere(selected.children, { id: selected.doc.contact._id })) {
          // the contact will be shown in the children pane, so remove contact field
          delete fields.contact;
        }
        return fields;
      };

      var getPrimaryContact = function(doc) {
        if (!doc || !doc.contact || !doc.contact._id) {
          return $q.resolve();
        }
        // Fetch the contact person from db instead of using the contents of the contact field.
        // Because in 2017 we stop copying stuff in docs.
        return DB().get(doc.contact._id)
          .catch(function(err) {
            if (err.status === 404 || err.error === 'not_found') {
              return;
            }
            throw err;
          });
      };

      var isPersonAndPrimaryContact = function(contactDoc) {
        if (contactDoc.type !== 'person') {
          return $q.resolve(false);
        }
        if (!contactDoc.parent || !contactDoc.parent._id) {
          return $q.resolve(false);
        }
        // Fetch parent to check if person is primary contact.
        // We don't rely on contactDoc.parent.contact, because it's a circular dependency so
        // it'll disappear in data cleanup eventually.
        return DB().get(contactDoc.parent._id)
          .then(function(parent) {
            return parent.contact && (parent.contact._id === contactDoc._id);
          }).catch(function(err) {
            $log.error(err);
            return false;
          });
      };

      var getReports = function(contactDocsArray) {
        var subjectIds = [];
        contactDocsArray.forEach(function(contactDoc) {
          subjectIds.push(contactDoc._id);
          if (contactDoc.patient_id) {
            subjectIds.push(contactDoc.patient_id);
          }
          if (contactDoc.place_id) {
            subjectIds.push(contactDoc.place_id);
          }
        });
        return Search('reports', { subjectIds: subjectIds }, { include_docs: true })
          .then(function(reports) {
            reports.forEach(function(report) {
              report.valid = !report.errors || !report.errors.length;
            });
            return reports;
          });
      };

      var sortReports = function(reports) {
        reports.sort(function(a, b) {
          if (a.reported_date > b.reported_date) {
            return -1;
          }
          if (a.reported_date < b.reported_date) {
            return 1;
          }
          return 0;
        });
      };

      var placePrimaryContactOnTop = function(primaryContactDoc, persons) {
        var removePrimaryContact = function(children, primaryContactDoc) {
          if (!children || children.length === 0 || !primaryContactDoc) {
            return;
          }
          var primaryContactIdx = _.findIndex(children, function(child) {
            return child.doc._id === primaryContactDoc._id;
          });
          if (primaryContactIdx < 0) {
            return;
          }
          children.splice(primaryContactIdx, 1);
        };

        if (primaryContactDoc) {
          removePrimaryContact(persons, primaryContactDoc);
          persons.unshift({ id: primaryContactDoc._id, doc: primaryContactDoc, isPrimaryContact: true });
        }
      };


      var sortChildPersons = function(children, contactDoc, primaryContactDoc) {
        if (!children.persons) {
          children.persons = [];
        }
        if (children.persons.length) {
          if (contactDoc.type === 'clinic') {
            sortFamilyMembers(children.persons);
          }
        }
        placePrimaryContactOnTop(primaryContactDoc, children.persons);
      };

      var getPersonReports = function(persons) {
        if (persons && persons.length) {
          return getReports(persons.map(function(child) { return child.doc; }));
        }
        return $q.resolve([]);
      };

      var getParents = function(contactDoc) {
        return getHomePlaceId().then(function(home) {
          var parents = [];
          var link = contactDoc._id !== home;
          var current = contactDoc.parent;
          while (current) {
            parents.push({
              _id: current._id,
              name: current.name,
              link: link
            });
            if (current._id === home) {
              // don't link to any places above the users home place
              link = false;
            }
            current = current.parent;
          }
          return parents;
        });
      };

      var addPatientName = function(reports, children) {
        reports.filter(function(report) {
          return report.fields && !report.fields.patient_name;
        }).forEach(function(report) {
          var patientId = report.fields.patient_id ||
                          report.patient_id;

          var patient = children.find(function(child) {
            return child.doc.patient_id === patientId;
          });

          if (patient) {
            report.fields.patient_name = patient.doc.name;
          }
        });
      };

      var getInitialData = function(contactId) {
        return DB().get(contactId)
          .then(function(contactDoc) {
            return $q.all([
              getReports([contactDoc]),
              isPersonAndPrimaryContact(contactDoc),
              getChildren(contactDoc),
              getParents(contactDoc),
              getPrimaryContact(contactDoc)
            ])
              .then(function(results) {
                var reports = results[0];
                var isPrimaryContact = results[1];
                var children = results[2];
                var parents = results[3];
                var primaryContact = results[4];
                var schema = ContactSchema.get(contactDoc.type);

                var selected = {
                  doc: contactDoc,
                  reports: reports,
                  parents: parents,
                  icon: schema.icon,
                  label: schema.label,
                  isPrimaryContact: isPrimaryContact
                };

                selected.fields = selectedSchemaVisibleFields(selected);

                sortChildPersons(children, contactDoc, primaryContact);

                if (children.places && children.places.length) {
                  var childPlacesSchema = ContactSchema.get(children.places[0].doc.type);
                  children.childPlacesLabel = childPlacesSchema.pluralLabel;
                  children.childPlacesIcon = childPlacesSchema.icon;
                }

                selected.children = children;

                return getPersonReports(children.persons).then(function(childrenReports) {
                  if (childrenReports.length) {
                    addPatientName(childrenReports, children.persons);
                    selected.reports = childrenReports.concat(selected.reports);
                  }
                  return selected;
                });
              })
              .then(function(selected) {
                sortReports(selected.reports);
                return selected;
              });
          });
      };

      var getTasks = function() {
        $scope.selected.tasks = [];
        var childrenPersonIds = $scope.selected.children && $scope.selected.children.persons &&
          _.pluck($scope.selected.children.persons, 'id');
        TasksForContact(
          $scope.selected.doc._id,
          $scope.selected.doc.type,
          childrenPersonIds,
          'ContactsContentCtrl',
          function(areTasksEnabled, tasks) {
            if ($scope.selected) {
              $scope.selected.areTasksEnabled = areTasksEnabled;
              $scope.selected.tasks = tasks;
              $scope.selected.children.persons.forEach(function(child) {
                child.taskCount = tasks.filter(function(task) {
                  return task.doc &&
                         task.doc.contact &&
                         task.doc.contact._id === child.doc._id;
                }).length;
              });
              if (!$scope.$$phase) {
                $scope.$apply();
              }
            }
          });
      };

      var selectContact = function(id) {
        $scope.setLoadingContent(id);
        return getInitialData(id)
          .then(function(selected) {
            var refreshing = ($scope.selected && $scope.selected.doc._id) === id;
            $scope.setSelected(selected);
            $scope.settingSelected(refreshing);
            getTasks();
          })
          .catch(function(err) {
            $scope.clearSelected();
            $log.error('Error setting up ContactsContentCtrl', err);
          });
      };

      var setupPromise = $q.resolve()
        .then(function() {
          if ($stateParams.id) {
            return selectContact($stateParams.id);
          }
          $scope.clearSelected();
          if ($scope.isMobile()) {
            return;
          }
          return getHomePlaceId().then(function(id) {
            if (id) {
              return selectContact(id);
            }
          });
        });
      this.getSetupPromiseForTesting = function() { return setupPromise; };

      var changeListener = Changes({
        key: 'contacts-content',
        filter: function(change) {
          return $scope.selected && $scope.selected.doc._id === change.id;
        },
        callback: function(change) {
          if (change.deleted) {
            var parentId = $scope.selected &&
                           $scope.selected.doc &&
                           $scope.selected.doc.parent &&
                           $scope.selected.doc.parent._id;
            if (parentId) {
              // select the parent
              selectContact(parentId);
            } else {
              // top level contact deleted - clear selection
              $scope.clearSelected();
            }
          } else {
            // refresh the updated contact
            selectContact(change.id);
          }
        }
      });

      $scope.$on('$destroy', changeListener.unsubscribe);

    }
  );

}());
