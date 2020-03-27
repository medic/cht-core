angular.module('inboxControllers').controller('ContactsDeceasedCtrl',
  function(
    $log,
    $ngRedux,
    $scope,
    $state,
    $stateParams,
    $translate,
    Changes,
    ContactsActions,
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
      const contactsActions = ContactsActions(dispatch);
      return {
        unsetSelected: globalActions.unsetSelected,
        setSelectedContact: contactsActions.setSelectedContact,
        setTitle: globalActions.setTitle,
      };
    };
    const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

    const selectContact = function(id, silent) {
      ctrl.setSelectedContact(id)
        .then(() => {
          $translate('contact.deceased.title')
            .then(ctrl.setTitle)
            .catch(() => {});
        })
        .catch(function(err) {
          if (err.code === 404 && !silent) {
            $translate('error.404.title').then(Snackbar);
          }
          ctrl.unsetSelected();
          $log.error('Error generating contact view model', err, err.message);
        });
    };

    if ($stateParams.id) {
      selectContact($stateParams.id);
    }

    const changeListener = Changes({
      key: 'contacts-deceased',
      filter: function(change) {
        return ctrl.selectedContact && ctrl.selectedContact.doc._id === change.id;
      },
      callback: function(change) {
        if (change.deleted) {
          const parentId = ctrl.selectedContact &&
                           ctrl.selectedContact.doc &&
                           ctrl.selectedContact.doc.parent &&
                           ctrl.selectedContact.doc.parent._id;
          return $state.go('contacts.detail', { id: parentId || null });
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
