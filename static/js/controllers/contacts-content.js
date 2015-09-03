(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ContactsContentCtrl', 
    ['$scope', '$stateParams', 'DB',
    function ($scope, $stateParams, DB) {

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
        Promise.all([ getContact(id), getChildren(id), getContactFor(id) ])
          .then(function(results) {
            var doc = results[0];
            doc.children = results[1].rows;
            doc.contactFor = results[2].rows;
            var refreshing = ($scope.selected && $scope.selected._id) === id;
            $scope.setSelected(doc);

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
