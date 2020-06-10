const _ = require('lodash/core');

(function () {

  'use strict';

  angular.module('inboxControllers').controller('TrainingsContentCtrl',
    function (
      $log,
      $ngRedux,
      $scope,
      $state,
      $stateParams,
      $timeout,
      Changes,
      GlobalActions,
      MessageState,
      /* Modal, */
      SearchFilters,
      Selectors,
      TrainingsActions
    ) {

      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          forms: Selectors.getForms(state),
          loadingContent: Selectors.getLoadingContent(state),
          selectMode: Selectors.getSelectMode(state),
          selectedTrainings: Selectors.getSelectedTrainings(state),
          summaries: Selectors.getSelectedTrainingsSummaries(state)/* ,
          validChecks: Selectors.getSelectedTrainingsValidChecks(state) */
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        const trainingsActions = TrainingsActions(dispatch);
        return {
          unsetSelected: globalActions.unsetSelected,
          clearCancelCallback: globalActions.clearCancelCallback,
          removeSelectedTraining: trainingsActions.removeSelectedTraining,
          selectTraining: trainingsActions.selectTraining,
          setFirstSelectedTrainingFormattedProperty: trainingsActions.setFirstSelectedTrainingFormattedProperty,
          setSelectedTrainings: trainingsActions.setSelectedTrainings,
          setRightActionBarVerified: globalActions.setRightActionBarVerified,
          updateSelectedTrainingItem: trainingsActions.updateSelectedTrainingItem
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      if ($stateParams.id) {
        ctrl.selectTraining($stateParams.id);
        ctrl.clearCancelCallback();
        $('.tooltip').remove();
      } else {
        ctrl.unsetSelected();
      }

      ctrl.search = function(query) {
        SearchFilters.freetextSearch(query);
      };

      ctrl.canMute = function(group) {
        return MessageState.any(group, 'scheduled');
      };

      ctrl.canSchedule = function(group) {
        return MessageState.any(group, 'muted');
      };

      const setMessageState = function(training, group, from, to) {
        group.loading = true;
        const id = training._id;
        const groupNumber = group.rows[0].group;
        MessageState.set(id, groupNumber, from, to).catch(function(err) {
          group.loading = false;
          $log.error('Error setting message state', err);
        });
      };

      ctrl.mute = function(training, group) {
        setMessageState(training, group, 'scheduled', 'muted');
      };

      ctrl.schedule = function(training, group) {
        setMessageState(training, group, 'muted', 'scheduled');
      };

      ctrl.toggleExpand = function(selection) {
        if (!ctrl.selectMode) {
          return;
        }

        const id = selection._id;
        if (selection.training || selection.expanded) {
          ctrl.updateSelectedTrainingItem(id, { expanded: !selection.expanded });
        } else {
          ctrl.updateSelectedTrainingItem(id, { loading: true });
          ctrl.selectTraining(id, { silent: true })
            .then(function() {
              ctrl.updateSelectedTrainingItem(id, { loading: false, expanded: true });
            })
            .catch(function(err) {
              ctrl.updateSelectedTrainingItem(id, { loading: false });
              $log.error('Error fetching doc for expansion', err);
            });
        }
      };

      ctrl.deselect = function(training, $event) {
        if (ctrl.selectMode) {
          $event.stopPropagation();
          ctrl.removeSelectedTraining(training._id);
        }
      };

      /* ctrl.edit = (training, group) => {
        Modal({
          templateUrl: 'templates/modals/edit_message_group.html',
          controller: 'EditMessageGroupCtrl',
          controllerAs: 'editMessageGroupCtrl',
          model: {
            training: training,
            group: angular.copy(group),
          },
        }).catch(() => {}); // dismissed
      }; */

      const changeListener = Changes({
        key: 'trainings-content',
        filter: function(change) {
          return ctrl.selectedTrainings &&
            ctrl.selectedTrainings.length &&
            _.some(ctrl.selectedTrainings, function(item) {
              return item._id === change.id;
            });
        },
        callback: function(change) {
          if (change.deleted) {
            if (ctrl.selectMode) {
              ctrl.removeSelectedTraining(change.id);
            } else {
              ctrl.unsetSelected();
              $state.go($state.current.name, { id: null });
            }
          } else {
            const selectedTrainings = ctrl.selectedTrainings;
            ctrl.selectTraining(change.id, { silent: true })
              .then(function() {
                if((change.doc && selectedTrainings[0].formatted.verified !== change.doc.verified) ||
                   (change.doc && ('oldVerified' in selectedTrainings[0].formatted &&
                    selectedTrainings[0].formatted.oldVerified !== change.doc.verified))) {
                  ctrl.setSelectedTrainings(selectedTrainings);
                  $timeout(function() {
                    ctrl.setFirstSelectedTrainingFormattedProperty({ verified: change.doc.verified });
                  });
                }
              });
          }
        }
      });

      $scope.$on('$destroy', function() {
        unsubscribe();
        changeListener.unsubscribe();
      });
    }
  );

}());
