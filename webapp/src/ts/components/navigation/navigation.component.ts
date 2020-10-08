import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';


@Component({
  selector: 'mm-navigation',
  templateUrl: './navigation.component.html'
})
export class NavigationComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;

  cancelCallback;
  title;

  constructor(
    private store: Store,
    private route:ActivatedRoute,
    private router:Router,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    const subscription = combineLatest(
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getTitle),
      //this.store.select(Selectors.getEnketoSavingStatus),
    ).subscribe(([
      cancelCallback,
      title,
    ]) => {
      this.cancelCallback = cancelCallback;
      this.title = title;
    });
    this.subscription.add(subscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  /**
  * Navigate back to the previous view
  */
  navigateBack() {
    const routeSnapshot = this.route.snapshot;
    console.warn(this.route);
    
    if (routeSnapshot.data.name === 'contacts.deceased') {
      // todo check if this works when we have migrated the contacts tabs
      return this.router.navigate(['contacts', routeSnapshot.params.id]);
    }

    if (routeSnapshot.params.id) {
      return this.router.navigate([routeSnapshot.data.name]);
    }

    this.globalActions.unsetSelected();
  }

  navigationCancel() {
    // todo
    // this.globalActions.navigationCancel();
  }
}

/*
angular.module('inboxDirectives').directive('mmNavigation', function() {
  'use strict';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/navigation.html',
    controller: function(
      $ngRedux,
      $scope,
      $state,
      $stateParams,
      GlobalActions,
      Selectors
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = state => {
        return {
          cancelCallback: Selectors.getCancelCallback(state),
          enketoSaving: Selectors.getEnketoSavingStatus(state),
          title: Selectors.getTitle(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          navigationCancel: globalActions.navigationCancel,
          unsetSelected: globalActions.unsetSelected
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);


      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'navigationCtrl'
  };
});
*/
