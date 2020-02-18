angular.module('inboxControllers').controller('AnalyticsTargetAggregatesCtrl', function (
  $log,
  $ngRedux,
  $scope,
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
  ctrl.enabled = false;
  ctrl.setError(null);
  ctrl.setTargetAggregates(null);

  TargetAggregates
    .isEnabled()
    .then(enabled => {
      ctrl.enabled = enabled;
      if (!ctrl.enabled) {
        return;
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

  $scope.$on('$destroy', unsubscribe);
});
