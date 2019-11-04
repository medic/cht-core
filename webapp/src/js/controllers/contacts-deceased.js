angular.module('inboxControllers').controller('ContactsDeceasedCtrl',
  function(
    $log,
    $ngRedux,
    $scope,
    $stateParams,
    $translate,
    Changes,
    ContactViewModelGenerator,
    GlobalActions,
    Selectors,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = function(state) {
      return {
        loadingContent: Selectors.getLoadingContent(state),
        selectedContact: Selectors.getSelectedContact(state)
      };
    };
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      return {
        setTitle: globalActions.setTitle,
        settingSelected: globalActions.settingSelected
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    var selectContact = function(id, silent) {
      $scope.setLoadingContent(id);
      ContactViewModelGenerator.getContact(id)
        .then(function(model) {
          var refreshing = (ctrl.selectedContact && ctrl.selectedContact.doc._id) === id;
          ctrl.settingSelected(refreshing);
          return $scope.setSelected(model);
        })
        .then(function() {
          $translate('contact.deceased.title')
            .then(ctrl.setTitle)
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
        return ctrl.selectedContact && ctrl.selectedContact.doc._id === change.id;
      },
      callback: function(change) {
        if (change.deleted) {
          var parentId = ctrl.selectedContact &&
                         ctrl.selectedContact.doc &&
                         ctrl.selectedContact.doc.parent &&
                         ctrl.selectedContact.doc.parent._id;
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
