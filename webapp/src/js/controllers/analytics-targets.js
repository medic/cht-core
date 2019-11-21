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
        ctrl.loading = isEnabled;
        return isEnabled ? RulesEngine.fetchTargets() : [];
      })
      .then(targets => {
        ctrl.loading = false;
        ctrl.targets = targets;
      })
      .catch(err => {
        $log.error('Error getting targets', err);
        ctrl.loading = false;
        ctrl.targets = [];
      });
  }
);
