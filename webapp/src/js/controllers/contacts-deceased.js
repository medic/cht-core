angular.module('inboxControllers').controller('ContactsDeceasedCtrl',
  function(
    $log,
    $scope,
    $stateParams,
    $translate,
    Changes,
    ContactViewModelGenerator,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    var selectContact = function(id, silent) {
      $scope.setLoadingContent(id);
      ContactViewModelGenerator(id)
        .then(function(model) {
          var refreshing = ($scope.selected && $scope.selected.doc._id) === id;
          $scope.settingSelected(refreshing);
          return $scope.setSelected(model);
        })
        .then(function() {
          $translate('contact.deceased')
            .then($scope.setTitle)
            .catch(function(err) {
              $log.error('Failed to translate title', err);
            });
        })
        .catch(function(err) {
          if (err.code === 404 && !silent) {
            $translate('error.404.title').then(Snackbar);
          }
          $scope.clearSelected();
          $log.error('Error generating contact view model', err, err.message);
        });
    };

    if ($stateParams.id) {
      selectContact($stateParams.id);
    }

    var changeListener = Changes({
      key: 'contacts-deceased',
      filter: function(change) {
        return $scope.selected && $scope.selected.doc._id === change.id;
      },
      callback: function(change) {
        if (change.deleted) {
          var parentId = $scope.selected &&
                         $scope.selected.doc &&
                         $scope.selected.doc.parent &&
                         $scope.selected.doc.parent._id;
          if (parentId) {
            // select the parent
            selectContact(parentId, true);
          } else {
            // top level contact deleted - clear selection
            $scope.clearSelected();
          }
        } else {
          // refresh the updated contact
          selectContact(change.id, true);
        }
      }
    });

    $scope.$on('$destroy', changeListener.unsubscribe);

  }
);
