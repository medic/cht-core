var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsContentCtrl',
    function(
      $log,
      $parse,
      $q,
      $scope,
      $stateParams,
      Changes,
      ContactSchema,
      DB,
      RulesEngine,
      Search,
      UserDistrict,
      XmlForms
    ) {

      'ngInject';

      $scope.showParentLink = false;

      var searchForReports = function(id) {
        return $q(function(resolve, reject) {
          Search('reports', { subjectIds: [ id ] }, {}, function(err, data) {
            if (err) {
              return reject(err);
            }
            resolve(data);
          });
        });
      };

      var getReports = function(id) {
        return $q.all([
          searchForReports(id),
          DB.get().query('medic/forms', { include_docs: true })
        ]).then(function(results) {
          var reports = results[0];
          var forms = results[1].rows;
          reports.forEach(function(report) {
            var form = _.find(forms, function(form) {
              return form.doc.internalId === report.form;
            });
            if (form) {
              report.formTitle = form.doc.title;
            } else {
              report.formTitle = report.form;
            }
          });
          return reports;
        });
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

      var getInitialData = function(id) {
        return $q.all([
          DB.get().get(id),
          getChildren(id),
          getContactFor(id),
          getReports(id)
        ])
          .then(function(results) {
            var selected = {
              doc: results[0],
              children: results[1].rows,
              contactFor: results[2].rows,
              reports: results[3].reverse()
            };
            selected.fields = selectedSchemaVisibleFields(selected);
            return selected;
          });
      };

      var updateParentLink = function() {
        UserDistrict(function(err, district) {
          if (err) {
            return $log.error('Error getting user district', err);
          }
          var parentId = $scope.selected.doc &&
                         $scope.selected.doc.parent &&
                         $scope.selected.doc.parent._id;
          $scope.showParentLink = parentId && district !== parentId;
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
        getInitialData(id)
          .then(function(selected) {

            var refreshing = ($scope.selected && $scope.selected.doc._id) === id;
            $scope.setSelected(selected);
            $scope.settingSelected(refreshing);
            getTasks();
            updateParentLink();

            XmlForms('ContactsContentCtrl', { doc: $scope.selected.doc }, function(err, forms) {
              if (err) {
                return $log.error('Error fetching relevant forms', err);
              }
              $scope.relevantForms = forms;
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
  );

}());
