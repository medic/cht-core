angular.module('inboxServices').factory('Actions',
  function(
    $ngRedux,
    $state,
    $stateParams,
    $timeout,
    Modal,
    LiveList
  ) {
    'ngInject';
    'use strict';

    return function(dispatch) {
      function createSetCancelCallbackAction(cancelCallback) {
        return {
          type: 'SET_CANCEL_CALLBACK',
          payload: {
            cancelCallback: cancelCallback
          }
        };
      }

      function createSetEnketoErrorAction(error) {
        return {
          type: 'SET_ENKETO_ERROR',
          payload: {
            error: error
          }
        };
      }

      function createSetEnketoEditedStatusAction(edited) {
        return {
          type: 'SET_ENKETO_EDITED_STATUS',
          payload: {
            edited: edited
          }
        };
      }

      function createSetEnketoSavingStatusAction(saving) {
        return {
          type: 'SET_ENKETO_SAVING_STATUS',
          payload: {
            saving: saving
          }
        };
      }

      function createSetLoadingContentAction(loadingContent) {
        return {
          type: 'SET_LOADING_CONTENT',
          payload: {
            loadingContent: loadingContent
          }
        };
      }

      function createSetSelectedAction(selected) {
        return {
          type: 'SET_SELECTED',
          payload: {
            selected: selected
          }
        };
      }

      function createSetShowActionBarAction(showActionBar) {
        return {
          type: 'SET_SHOW_CONTENT',
          payload: {
            showActionBar: showActionBar
          }
        };
      }

      function createSetShowContentAction(showContent) {
        return {
          type: 'SET_SHOW_ACTION_BAR',
          payload: {
            showContent: showContent
          }
        };
      }

      function createSetTitleAction(title) {
        return {
          type: 'SET_TITLE',
          payload: {
            title: title
          }
        };
      }

      function clearSelection() {
        var currentPage = $state.current.name.split('.')[0];
        if (currentPage === 'messages' || currentPage === 'tasks') {
          dispatch(createSetSelectedAction(null));
        } else if (currentPage === 'contacts') {
          dispatch(createSetSelectedAction(null));
          LiveList.contacts.clearSelected();
          LiveList['contact-search'].clearSelected();
        } else if (currentPage === 'reports') {
          dispatch(createSetSelectedAction({}));
          LiveList.reports.clearSelected();
          LiveList['report-search'].clearSelected();
          $('#reports-list input[type="checkbox"]').prop('checked', false);
          // $scope.verifyingReport = false; // TODO this shouldn't be global
        }
      }

      /**
       * Unset the selected item without navigation
       */
      function unsetSelected() {
        dispatch(createSetShowContentAction(false));
        dispatch(createSetLoadingContentAction(false));
        dispatch(createSetShowActionBarAction(false));
        dispatch(createSetTitleAction());
        clearSelection();
      }

      return {
        unsetSelected: unsetSelected,

        /**
         * Clear the selected item - may update the URL
         */
        clearSelected: function() {
          if ($state.current.name === 'contacts.deceased') {
            $state.go('contacts.detail', { id: $stateParams.id });
          } else if ($stateParams.id) {
            $state.go($state.current.name, { id: null });
          } else {
            unsetSelected();
          }
        },

        settingSelected: function(refreshing) {
          dispatch(createSetLoadingContentAction(false));
          $timeout(function() {
            dispatch(createSetShowContentAction(true));
            dispatch(createSetShowActionBarAction(true));
            if (!refreshing) {
              $timeout(function() {
                $('.item-body').scrollTop(0);
              });
            }
          });
        },

        navigationCancel: function() {
          var state = $ngRedux.getState();
          if (state.enketoStatus.saving) {
            // wait for save to finish
            return;
          }
          if (!state.enketoStatus.edited) {
            // form hasn't been modified - return immediately
            if (state.cancelCallback) {
              state.cancelCallback();
            }
            return;
          }
          // otherwise data will be discarded so confirm navigation
          Modal({
            templateUrl: 'templates/modals/navigation_confirm.html',
            controller: 'NavigationConfirmCtrl',
            singleton: true,
          }).then(function() {
            dispatch(createSetEnketoEditedStatusAction(false));
            if (state.cancelCallback) {
              state.cancelCallback();
            }
          });
        },

        clearCancelCallback: function() {
          dispatch(createSetCancelCallbackAction(null));
        },

        setCancelCallback: function(cancelCallback) {
          dispatch(createSetCancelCallbackAction(cancelCallback));
        },

        setEnketoError: function(error) {
          dispatch(createSetEnketoErrorAction(error));
        },

        setEnketoEditedStatus: function(edited) {
          dispatch(createSetEnketoEditedStatusAction(edited));
        },

        setEnketoSavingStatus: function(saving) {
          dispatch(createSetEnketoSavingStatusAction(saving));
        },

        setLoadingContent: function(loadingContent) {
          dispatch(createSetLoadingContentAction(loadingContent));
        },

        setSelected: function(selected) {
          dispatch(createSetSelectedAction(selected));
        },

        setShowActionBar: function(showActionBar) {
          dispatch(createSetShowActionBarAction(showActionBar));
        },

        setShowContent: function(showContent) {
          // if (showContent && $scope.selectMode) { // TODO what is selectMode??
          //   // when in select mode we never show the RHS on mobile
          //   return;
          // }
          dispatch(createSetShowContentAction(showContent));
        },

        setTitle: function(title) {
          dispatch(createSetTitleAction(title));
        }
      };
    };
  }
);
