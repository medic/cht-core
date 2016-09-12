var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsContentCtrl',
    function(
      $log,
      $q,
      $scope,
      $stateParams,
      Changes,
      ContactSchema,
      DB,
      RulesEngine,
      Search,
      UserSettings
    ) {

      'ngInject';

      $scope.showParentLink = false;

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

      var sortPersons = function(persons) {
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

      var sortPlaces = function(places) {
        if (!places) {
          return;
        }
        places.sort(genericSort);
      };

      var getChildren = function(id) {
        var options = {
          startkey: [ id ],
          endkey: [ id, {} ],
          include_docs: true
        };
        return DB()
          .query('medic-client/contacts_by_parent_name_type', options)
          .then(function(children) {
            var groups = splitChildren(children.rows);
            sortPlaces(groups.places);
            sortPersons(groups.persons);
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
        return split[0].concat(split[1]);
      };

      var getInitialData = function(contactId) {
        return $q.all([
          DB().get(contactId),
          getChildren(contactId)
        ])
          .then(function(results) {
            var children = results[1];
            children.persons = childrenWithContactPersonOnTop(children.persons, results[0]);
            var selected = {
              doc: results[0],
              children: children
            };
            if (selected.children.places && selected.children.places.length) {
              selected.children.childPlaceType = selected.children.places[0].doc.type + '.plural';
            }
            selected.fields = selectedSchemaVisibleFields(selected);
            return selected;
          });
      };

      var updateParentLink = function() {
        getHomePlaceId().then(function(homeId) {
          var docId = $scope.selected.doc && $scope.selected.doc._id;
          $scope.showParentLink = docId && homeId !== docId;
        });
      };

      var mergeTasks = function(tasks) {
        var selectedTasks = $scope.selected && $scope.selected.tasks;
        $log.debug('Updating contact tasks', selectedTasks, tasks);
        if (selectedTasks) {
          tasks.forEach(function(task) {
            for (var i = 0; i < selectedTasks.length; i++) {
              if (selectedTasks[i]._id === task._id) {
                selectedTasks[i] = task;
                return;
              }
            }
            selectedTasks.push(task);
          });
        }
      };

      var getTasks = function() {
        $scope.selected.tasks = [];
        if ($scope.selected.doc.type === 'district_hospital' ||
            $scope.selected.doc.type === 'health_center') {
          return;
        }
        var patientIds = [];
        if ($scope.selected.doc.type === 'clinic') {
          patientIds = _.pluck($scope.selected.children, 'id');
        }
        patientIds.push($scope.selected.doc._id);
        RulesEngine.listen('ContactsContentCtrl', 'task', function(err, tasks) {
          if (err) {
            return $log.error('Error getting tasks', err);
          }
          mergeTasks(_.filter(tasks, function(task) {
            return task.contact && _.contains(patientIds, task.contact._id);
          }));
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
