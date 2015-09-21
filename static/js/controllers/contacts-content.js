var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsContentCtrl', 
    ['$scope', '$stateParams', '$q', '$state', '$log', 'DB', 'Enketo', 'TaskGenerator', 'Search',
    function ($scope, $stateParams, $q, $state, $log, DB, Enketo, TaskGenerator, Search) {

      $scope.form = null;

      var getReports = function(ids) {
        if (ids.length === 0) {
          return $q.resolve([]);
        }
        var scope = {
          filterModel: { patientIds: ids, type: 'reports' }
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
            var subjectId = task.doc.patient_id || task.doc.fields.patient_id;
            return !task.resolved && _.contains(ids, subjectId);
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
        return $q.all([ getContact(id), getChildren(id), getContactFor(id) ])
          .then(function(results) {
            return $q.resolve({
              doc: results[0],
              children: results[1].rows,
              contactFor: results[2].rows
            });
          });
      };

      var getSecondaryData = function(selected) {
        if (selected.doc.type === 'district_hospital' ||
            selected.doc.type === 'health_center') {
          return $q.resolve(selected);
        }
        var patientIds;
        if (selected.doc.type === 'clinic') {
          patientIds = _.pluck(selected.children, 'id');
        } else { // person
          patientIds = [ selected.doc._id ];
        }
        return $q.all([ getTasks(patientIds), getReports(patientIds) ])
          .then(function(results) {
            selected.tasks = results[0];
            selected.reports = results[1];
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
          })
          .catch(function(err) {
            $scope.clearSelected();
            console.log('Error fetching doc', err);
          });
      };

      if ($stateParams.id) {
        selectContact($stateParams.id);
      } else {
        $scope.clearSelected();
      }

      $scope.submitReport = function(form) {
        $scope.loadingForm = true;
        var instanceData = {};
        if ($scope.selected.type === 'person') {
          instanceData.patient_id = $state.params.id;
        } else {
          instanceData.place_id = $state.params.id;
        }
        Enketo.render($('#contact-report'), form.internalId, instanceData)
          .then(function(form) {
            $scope.form = form;
            $scope.loadingForm = false;
          })
          .catch(function(err) {
            $scope.contentError = true;
            $scope.loadingForm = false;
            $log.error('Error loading form.', err);
          });
      };

      $scope.$on('ContactUpdated', function(e, contact) {
        if (!contact) {
          $scope.select();
        } else if(contact._deleted &&
            $scope.selected &&
            $scope.selected._id === contact._id) {
          $scope.clearSelected();
        } else if ($scope.selected && $scope.selected._id === contact._id) {
          $scope.selectContact(contact._id);
        }
      });

    }
  ]);

}());
