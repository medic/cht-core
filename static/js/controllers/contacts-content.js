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
      RulesEngine,
      Search,
      UserSettings
    ) {

      'ngInject';

      $scope.showParentLink = false;

      var taskEndDate,
          reportStartDate;

      $scope.filterTaskWeeksForward = function(task) {
        return !taskEndDate || taskEndDate.isAfter(task.date);
      };
      $scope.filterReportWeeksBack = function(report) {
        return !reportStartDate || reportStartDate.isBefore(report.reported_date);
      };

      $scope.setReportMonthsFilter = function(months) {
        $scope.reportMonthsBack = months;
        reportStartDate = months ? moment().subtract(months, 'months') : null;
      };

      $scope.setTaskWeeksFilter = function(weeks) {
        $scope.taskWeeksBack = weeks;
        taskEndDate = weeks ? moment().add(weeks, 'weeks') : null;
      };

      $scope.setTaskWeeksFilter(1);
      $scope.setReportMonthsFilter(3);

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

      var genericSort = function(lhs, rhs) {
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
          return genericSort(lhs, rhs);
        });
      };

      var sortContacts = function(places) {
        if (!places) {
          return;
        }
        places.sort(genericSort);
      };

      var getChildren = function(contactDoc) {
        if (contactDoc.type === 'person') {
          return $q.resolve();
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

      var childrenWithContactPersonOnTop = function(children, parent) {
        var contactPersonId = parent.contact && parent.contact._id;
        if (!contactPersonId) {
          return children;
        }
        var split = _.partition(children, function(child) {
          return child.doc._id === contactPersonId;
        });
        if (split[0].length) {
          split[0][0].doc.isPrimaryContact = true;
        }
        return split[0].concat(split[1]);
      };

      var isPersonAndPrimaryContact = function(contactDoc) {
        if (contactDoc.type !== 'person') {
          return $q.resolve();
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
        return reports.sort(function(a, b) {
          if (a.reported_date > b.reported_date) {
            return -1;
          }
          if (a.reported_date < b.reported_date) {
            return 1;
          }
          return 0;
        });
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
                selected.doc.icon = ContactSchema.get(contactDoc.type).icon;
                selected.doc.label = ContactSchema.get(contactDoc.type).label;
                selected.doc.isPrimaryContact = isPrimaryContact;
                selected.fields = selectedSchemaVisibleFields(selected);
                if (!children || (!children.places && !children.persons)) {
                  selected.reports = sortReports(selected.reports);
                  return selected;
                }

                if (selected.doc.type === 'clinic') {
                  sortFamilyMembers(children.persons);
                }
                children.persons = childrenWithContactPersonOnTop(children.persons, contactDoc);
                selected.children = children;
                if (selected.children.places && selected.children.places.length) {
                  var childPlacesSchema = ContactSchema.get(selected.children.places[0].doc.type);
                  selected.children.childPlacesLabel = childPlacesSchema.pluralLabel;
                  selected.children.childPlacesIcon = childPlacesSchema.icon;
                }
                return getReports(children.persons.map(function(child) { return child.doc; }))
                  .then(function(childrenReports) {
                    selected.reports = sortReports(selected.reports.concat(childrenReports));
                    return selected;
                  });
              });
          });
      };

      var updateParentLink = function() {
        getHomePlaceId().then(function(homeId) {
          var docId = $scope.selected.doc && $scope.selected.doc._id;
          $scope.showParentLink = docId && homeId !== docId;
        });
      };

      var mergeTasks = function(existingTasks, newTasks) {
        $log.debug('Updating contact tasks', existingTasks, newTasks);
        if (existingTasks) {
          newTasks.forEach(function(task) {
            for (var i = 0; i < existingTasks.length; i++) {
              if (existingTasks[i]._id === task._id) {
                existingTasks[i] = task;
                return;
              }
            }
            existingTasks.push(task);
          });
        }
      };

      var sortTasks = function(tasks) {
        tasks.sort(function(a, b) {
          var dateA = new Date(a.date).getTime();
          var dateB = new Date(b.date).getTime();
          if (dateA < dateB) {
            return -1;
          }
          if (dateA > dateB) {
            return 1;
          }
          return 0;
        });
      };

      var getTasks = function() {
        $scope.selected.tasks = [];
        if ($scope.selected.doc.type === 'district_hospital' ||
            $scope.selected.doc.type === 'health_center') {
          return;
        }
        var patientIds = [];
        if ($scope.selected.doc.type === 'clinic' &&
          $scope.selected.children && $scope.selected.children.persons) {
          patientIds = _.pluck($scope.selected.children.persons, 'id');
        }
        patientIds.push($scope.selected.doc._id);
        RulesEngine.listen('ContactsContentCtrl', 'task', function(err, tasks) {
          if (err) {
            return $log.error('Error getting tasks', err);
          }
          var newTasks = _.filter(tasks, function(task) {
            return !task.resolved && task.contact && _.contains(patientIds, task.contact._id);
          });
          mergeTasks($scope.selected.tasks, newTasks);
          sortTasks($scope.selected.tasks);
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
            $log.error('Error fetching doc', err);
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
