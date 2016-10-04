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

      $scope.showParentLink = false;

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

      var shiftAndMarkContactPerson = function(children, parent) {
        if (!children || !children.length) {
          return;
        }
        var contactPersonId = parent.contact && parent.contact._id;
        if (!contactPersonId) {
          return;
        }
        var primaryContactIdx = _.findIndex(children, function(child) {
          return child.doc._id === contactPersonId;
        });
        if (primaryContactIdx < 0) {
          return;
        }
        var primaryContact = children[primaryContactIdx];
        primaryContact.isPrimaryContact = true;
        children.splice(primaryContactIdx, 1);
        children.unshift(primaryContact);
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
        return Search('reports', { subjectIds: subjectIds });
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

      var sortChildPersons = function(persons, contactDoc) {
        if (persons && persons.length) {
          if (contactDoc.type === 'clinic') {
            sortFamilyMembers(persons);
          }
          shiftAndMarkContactPerson(persons, contactDoc);
        }
      };

      var getPersonReports = function(persons) {
        if (persons && persons.length) {
          return getReports(persons.map(function(child) { return child.doc; }));
        }
        return $q.resolve([]);
      };

      var getInitialData = function(contactId) {
        return DB().get(contactId)
          .then(function(contactDoc) {
            return $q.all([
              getReports([contactDoc]),
              isPersonAndPrimaryContact(contactDoc),
              getChildren(contactDoc)
            ])
              .then(function(results) {
                var reports = results[0];
                var isPrimaryContact = results[1];
                var children = results[2];
                var selected = {
                  doc: contactDoc,
                  reports: reports
                };
                selected.icon = ContactSchema.get(contactDoc.type).icon;
                selected.label = ContactSchema.get(contactDoc.type).label;
                selected.isPrimaryContact = isPrimaryContact;
                selected.fields = selectedSchemaVisibleFields(selected);

                sortChildPersons(children.persons, contactDoc);

                if (children.places && children.places.length) {
                  var childPlacesSchema = ContactSchema.get(children.places[0].doc.type);
                  children.childPlacesLabel = childPlacesSchema.pluralLabel;
                  children.childPlacesIcon = childPlacesSchema.icon;
                }

                selected.children = children;

                return getPersonReports(children.persons)
                  .then(function(childrenReports) {
                    if (childrenReports) {
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

      var updateParentLink = function() {
        getHomePlaceId().then(function(homeId) {
          var docId = $scope.selected.doc && $scope.selected.doc._id;
          $scope.showParentLink = docId && homeId !== docId;
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
            $scope.selected.areTasksEnabled = areTasksEnabled;
            $scope.selected.tasks = tasks;
            if (!$scope.$$phase) {
              $scope.$apply();
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
            updateParentLink();
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

      Changes({
        key: 'contacts-content',
        filter: function(change) {
          return $scope.selected && $scope.selected.doc._id === change.id;
        },
        callback: function(change) {
          if (change.deleted) {
            $scope.clearSelected();
          } else {
            selectContact(change.id);
          }
        }
      });

    }
  );

}());
