angular.module('inboxControllers').controller('AnalyticsTargetsCtrl', function (
  $log,
  RulesEngine
) {

  'use strict';
  'ngInject';

  const ctrl = this;

  ctrl.targets = [];
  ctrl.loading = true;
  ctrl.targetsDisabled = false;

  RulesEngine.isEnabled()
    .then(isEnabled => {
      ctrl.targetsDisabled = !isEnabled;
      return isEnabled ? RulesEngine.fetchTargets() : [];
    })
    .catch(err => {
      $log.error('Error getting targets', err);
      return [];
    })
    .then(targets => {
      ctrl.loading = false;
      ctrl.targets = targets;
    });
}
);
