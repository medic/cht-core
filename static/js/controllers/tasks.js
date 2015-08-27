(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TasksCtrl',
    ['$timeout', '$scope', '$state', 'TaskGenerator', 'Changes',
    function ($timeout, $scope, $state, TaskGenerator, Changes) {

      var _selectedId;

      $scope.setSelectedId = function(id) {
        _selectedId = id;
        selectItem();
      };

      var selectItem = function() {
        if (_selectedId) {
          $scope.items.forEach(function(item) {
            if (item._id === _selectedId) {
              $scope.setSelected(item);
            }
          });
        } else if(!$state.params.id && $scope.items.length && !$('#back').is(':visible')) {
          $timeout(function() {
            var id = $('.inbox-items li').first().attr('data-record-id');
            $state.go('tasks.detail', { id: id });
          });
        } else {
          $scope.setSelected();
        }
      };

      var updateTasks = function(options) {
        options = options || {};
        if (!options.silent) {
          $scope.loading = true;
        }
        $scope.error = false;
        TaskGenerator()
          .then(function(tasks) {
            $scope.setTasks(tasks);
            $scope.loading = false;
            selectItem();
          })
          .catch(function(err) {
            console.log('Error generating tasks', err);
            $scope.loading = false;
            $scope.error = true;
            $scope.setTasks();
          });
      };

      $scope.setSelectedModule();
      $scope.filterModel.type = 'tasks';
      $scope.setTasks();
      updateTasks();

      Changes({
        key: 'tasks-list',
        callback: function() {
          updateTasks({ silent: true });
        },
        filter: function(change) {
          if ($scope.filterModel.type !== 'tasks') {
            return false;
          }
          if (change.newDoc) {
            return change.newDoc.form;
          }
          return true;
        }
      });
    }
  ]);

}());