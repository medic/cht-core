angular.module('inboxControllers').controller('PrivacyPolicyCtrl',
  function(
    $ngRedux,
    $scope,
    GlobalActions,
    PrivacyPolicies
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapDispatchToTarget = function(dispatch) {
      const globalActions = GlobalActions(dispatch);
      return {
        setPrivacyPolicyAccepted: globalActions.setPrivacyPolicyAccepted,
        setShowPrivacyPolicy: globalActions.setShowPrivacyPolicy,
      };
    };
    const unsubscribe = $ngRedux.connect(null, mapDispatchToTarget)(ctrl);

    ctrl.loading = true;
    ctrl.accepting = false;
    ctrl.setupPromise = PrivacyPolicies.getPrivacyPolicy().then(privacyPolicy => {
      ctrl.loading = false;
      if (!privacyPolicy) {
        ctrl.setPrivacyPolicyAccepted(true);
        ctrl.setShowPrivacyPolicy(false);
        return;
      }

      ctrl.privacyPolicy = privacyPolicy;
    });

    ctrl.accept = () => {
      ctrl.accepting = true;
      return PrivacyPolicies.accept(ctrl.privacyPolicy).then(() => {
        ctrl.setPrivacyPolicyAccepted(true);
      });
    };

    $scope.$on('$destroy', unsubscribe);
  });
