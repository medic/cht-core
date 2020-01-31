angular.module('inboxControllers').controller('AnalyticsTargetAggregatesCtrl', function (
  $log,
  $ngRedux,
  $scope,
  $state,
  Selectors,
  TargetAggregates,
  TargetAggregatesActions
) {

  'use strict';
  'ngInject';

  const ctrl = this;
  const mapStateToTarget = (state) => {
    return {
      aggregates: Selectors.getTargetAggregates(state),
      selected: Selectors.getSelectedTargetAggregate(state),
      error: Selectors.getTargetAggregatesError(state),
    };
  };
  const mapDispatchToTarget = (dispatch) => {
    const targetAggregatesActions = TargetAggregatesActions(dispatch);
    return {
      setTargetAggregates: targetAggregatesActions.setTargetAggregates,
      setError: targetAggregatesActions.setError,
    };
  };
  const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

  ctrl.loading = true;
  ctrl.aggregatesDisabled = false;
  ctrl.setError();

  TargetAggregates
    .isEnabled()
    .then(enabled => {
      ctrl.aggregatesDisabled = !enabled;
      if (ctrl.aggregatesDisabled) {
        return [];
      }

      return TargetAggregates.getAggregates();
    })
    .then(aggregates => {
      ctrl.setTargetAggregates(aggregates);
    })
    .catch(err => {
      $log.error('Error getting aggregate targets', err);
      ctrl.setError(err);
    })
    .then(() => {
      ctrl.loading = false;
    });

  ctrl.targetDetails = (targetId) => {
    $state.go('analytics.target-aggregates.detail', { id: targetId });
  };

  $scope.$on('$destroy', unsubscribe);
});
