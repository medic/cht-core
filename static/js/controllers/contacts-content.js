var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsContentCtrl', 
    ['$scope', '$stateParams', '$q', '$state', '$log', 'DB', 'Enketo', 'TaskGenerator', 'Search',
    function ($scope, $stateParams, $q, $state, $log, DB, Enketo, TaskGenerator, Search) {

      $scope.form = null;

      var getReports = function(id) {
        var scope = {
          filterModel: { patientId: id, type: 'reports' }
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

      var getTasks = function(id) {
        return TaskGenerator().then(function(tasks) {
          tasks = _.filter(tasks, function(task) {
            var subjectId = task.doc.patient_id || task.doc.fields.patient_id;
            return !task.resolved && subjectId === id;
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

      var selectContact = function(id) {
        $scope.setLoadingContent(id);
        $q.all([
          getContact(id),
          getChildren(id),
          getContactFor(id),
          getTasks(id),
          getReports(id)
        ])
          .then(function(results) {
            var selected = {
              doc: results[0],
              children: results[1].rows,
              contactFor: results[2].rows,
              tasks: results[3],
              reports: results[4]
            };
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
        var instanceData = { patient_id: $state.params.id };
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
