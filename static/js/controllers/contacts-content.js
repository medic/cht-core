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

      var getTasks = function(ids) {
        if (ids.length === 0) {
          return $q.resolve([]);
        }
        return TaskGenerator().then(function(tasks) {
          tasks = _.filter(tasks, function(task) {
            return !task.resolved &&
              task.contact &&
              _.contains(ids, task.contact._id);
          });
          return $q.resolve(tasks);
        });
      };

      var getContact = function(id) {
        return DB.get().get(id);
      };

      var getChildren = function(id) {
        var options = {
          startkey: [ id ],
          endkey: [ id, {} ],
          include_docs: true
        };
        return DB.get().query('medic/facility_by_parent', options);
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

      var getSecondaryData = function(selected) {
        if (selected.doc.type === 'district_hospital' ||
            selected.doc.type === 'health_center') {
          return $q.resolve(selected);
        }
        var patientIds = [];
        if (selected.doc.type === 'clinic') {
          patientIds = _.pluck(selected.children, 'id');
        }
        patientIds.push(selected.doc._id);
        return getTasks(patientIds)
          .then(function(tasks) {
            selected.tasks = tasks;
            return $q.resolve(selected);
          });
      };

      var selectContact = function(id) {
        $scope.setLoadingContent(id);
        getInitialData(id)
          .then(getSecondaryData)
          .then(function(selected) {
            var refreshing = ($scope.selected && $scope.selected.doc._id) === id;
            $scope.setSelected(selected);
            $scope.settingSelected(refreshing);

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
