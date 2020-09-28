import { Component, EventEmitter, OnDestroy, ChangeDetectorRef, Output } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Selectors } from '../../../selectors';
import { combineLatest, Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { GlobalActions } from '../../../actions/global';

@Component({
  selector: 'mm-freetext-filter',
  templateUrl: './freetext-filter.component.html'
})
export class FreetextFilterComponent implements OnDestroy {
  private subscription: Subscription = new Subscription();
  private globalActions;

  inputText;
  private inputTextChanged: Subject<string> = new Subject<string>();

  selectMode;
  currentTab;
  selectedReports;

  @Output() search: EventEmitter<any> = new EventEmitter();

  constructor(
    private store: Store,
  ) {
    const subscription = combineLatest(
      this.store.pipe(select(Selectors.getCurrentTab)),
      this.store.pipe(select(Selectors.getSelectMode)),
      this.store.pipe(select(Selectors.getSelectedReports))
    ).subscribe(([
      currentTab,
      selectMode,
      selectedReports,
    ]) => {
      this.currentTab = currentTab;
      this.selectMode = selectMode;
      this.selectedReports = selectedReports;
    });
    this.subscription.add(subscription);
    this.globalActions = new GlobalActions(store);

    this
      .inputTextChanged
      .pipe(debounceTime(100), distinctUntilChanged())
      .subscribe(inputText => {
        this.inputText = inputText;
        this.applyFilter();
      });
  }

  applyFilter() {
    this.globalActions.setFilter({ search: this.inputText });
    this.search.emit();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}



/*
angular.module('inboxDirectives').directive('mmFreetextFilter', function(SearchFilters) {
  'use strict';
  'ngInject';

  return {
    restrict: 'E',
    templateUrl: 'templates/directives/filters/freetext.html',
    controller: function($ngRedux, $scope, GlobalActions, Selectors) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          currentTab: Selectors.getCurrentTab(state),
          filters: Selectors.getFilters(state),
          selectMode: Selectors.getSelectMode(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          setFilter: globalActions.setFilter
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      ctrl.inputText = '';
      ctrl.updateFilter = function() {
        ctrl.setFilter({ search: ctrl.inputText });
      };

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'freetextFilterCtrl',
    bindToController: {
      search: '<',
      selected: '<'
    },
    link: function(s, e, a, controller) {
      SearchFilters.freetext(controller.search);
    }
  };
});
*/
