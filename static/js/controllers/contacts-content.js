var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsContentCtrl', 
    ['$scope', '$stateParams', '$q', '$log', 'DB', 'TaskGenerator', 'Search', 'Changes',
    function ($scope, $stateParams, $q, $log, DB, TaskGenerator, Search, Changes) {

      var getReports = function(id) {
        var scope = {
          filterModel: { subjectIds: [ id ], type: 'reports' }
        };
        return $q(function(resolve, reject) {
          Search(scope, { }, function(err, data) {
            if (err) {
              return reject(err);
            }
            resolve(data);
          });
        });
      };

      var getContact = function(id) {
        return DB.get().get(id);
      };

      var sortChildren = function(children) {
        children.sort(function(lhs, rhs) {
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
        });
      };

      var getChildren = function(id) {
        var options = {
          startkey: [ id ],
          endkey: [ id, {} ],
          include_docs: true
        };
        return DB.get()
          .query('medic/facility_by_parent', options)
          .then(function(children) {
            sortChildren(children.rows);
            return children;
          });
      };

      var getContactFor = function(id) {
        var options = {
          key: [ id ],
          include_docs: true
        };
        return DB.get().query('medic/facilities_by_contact', options);
      };

      var getInitialData = function(id) {
        return $q.all([
          getContact(id),
          getChildren(id),
          getContactFor(id),
          getReports(id)
        ])
          .then(function(results) {
            var selected = {
              doc: results[0],
              parents: [],
              children: results[1].rows,
              contactFor: results[2].rows,
              reports: results[3],
            };

            var parent = selected.doc.parent;
            while(parent && Object.keys(parent).length) {
              selected.parents.push(parent);
              parent = parent.parent;
            }

            return selected;
          });
      };

      var mergeTasks = function(tasks) {
        var selectedTasks = $scope.selected.tasks;
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
        TaskGenerator('ContactsContentCtrl', function(err, tasks) {
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
        getInitialData(id)
          .then(function(selected) {

            var refreshing = ($scope.selected && $scope.selected.doc._id) === id;
            $scope.setSelected(selected);
            $scope.settingSelected(refreshing);
            getTasks();

            $scope.relevantForms = _.filter($scope.formDefinitions, function(form) {
              if (!form.context) {
                return false;
              }
              if ($scope.selected.doc.type === 'person') {
                return form.context.person;
              }
              return form.context.place;
            });
          })
          .catch(function(err) {
            $scope.clearSelected();
            $log.error('Error fetching doc', err);
          });
      };

      if ($stateParams.id) {
        selectContact($stateParams.id);
      } else {
        $scope.clearSelected();
      }

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
  ]);

}());
