angular.module('inboxControllers').controller('ContactsDeceasedCtrl',
  function(
    $log,
    $ngRedux,
    $scope,
    $stateParams,
    $translate,
    Changes,
    ContactViewModelGenerator,
    Selectors,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    var ctrl = this;
    var mapStateToTarget = function(state) {
      return {
        selected: Selectors.getSelected(state),
      };
    };
    var unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);

    var selectContact = function(id, silent) {
      $scope.setLoadingContent(id);
      ContactViewModelGenerator.getContact(id)
        .then(function(model) {
          var refreshing = (ctrl.selected && ctrl.selected.doc._id) === id;
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
        return ctrl.selected && ctrl.selected.doc._id === change.id;
      },
      callback: function(change) {
        if (change.deleted) {
          var parentId = ctrl.selected &&
                         ctrl.selected.doc &&
                         ctrl.selected.doc.parent &&
                         ctrl.selected.doc.parent._id;
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

    $scope.$on('$destroy', function() {
      unsubscribe();
      changeListener.unsubscribe();
    });

  }
);
