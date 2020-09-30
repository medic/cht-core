import { Component, Input, OnInit } from '@angular/core';
import { Store, select } from '@ngrx/store';

import { Selectors } from '../../selectors';
import {SettingsService} from '../../services/settings.service';
import {HeaderTabsService} from '../../services/header-tabs.service';
import {AuthService} from '../../services/auth.service';
import {GlobalActions} from "../../actions/global";
import {ModalService} from "../../modals/mm-modal/mm-modal";
import {LogoutConfirmComponent} from "../../modals/logout/logout-confirm.component";
import { FeedbackComponent } from '../../modals/feedback/feedback.component';
import { combineLatest } from 'rxjs';
import { DBSyncService } from '../../services/db-sync.service';
import { GuidedSetupComponent } from '../../modals/guided-setup/guided-setup.component';


@Component({
  selector: 'mm-header',
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit {
  @Input() adminUrl;
  @Input() canLogOut;
  @Input() tours;

  showPrivacyPolicy = false;
  replicationStatus;
  currentTab;
  unreadCount = {};
  permittedTabs = [];

  private globalActions;

  constructor(
    private store: Store,
    private settingsService: SettingsService,
    private headerTabsService: HeaderTabsService,
    private authService: AuthService,
    private modalService: ModalService,
    private dbSyncService: DBSyncService,
  ) {
    combineLatest(
      store.pipe(select(Selectors.getReplicationStatus)),
      store.pipe(select(Selectors.getCurrentTab)),
    ).subscribe(([
      replicationStatus,
      currentTab
    ]) => {
      this.replicationStatus = replicationStatus;
      this.currentTab = currentTab;
    });

    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.settingsService.get().then(settings => {
      const tabs = this.headerTabsService.get(settings);
      return Promise.all(tabs.map(tab => this.authService.has(tab.permissions))).then(results => {
        this.permittedTabs = tabs.filter((tab,index) => results[index]);
        this.globalActions.setMinimalTabs(this.permittedTabs.length > 3);
      });
    });
  }

  openGuidedSetup() {
    this.modalService.show(GuidedSetupComponent);
  }

  openTourSelect() {

  }

  openFeedback() {
    this.modalService.show(FeedbackComponent);
  }

  logout() {
    this.modalService.show(LogoutConfirmComponent);
  }

  replicate() {
    this.dbSyncService.sync(true);
  }
}
/*

angular.module('inboxDirectives').directive('mmHeader', function() {
  return {
    restrict: 'E',
    templateUrl: 'templates/directives/header.html',
    controller: function(
      $ngRedux,
      $q,
      $scope,
      AuthService,
      DBSyncService,
      GlobalActions,
      HeaderTabsService,
      Modal,
      Selectors,
      SettingsService,
      Tour
    ) {
      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          currentTab: Selectors.getCurrentTab(state),
          replicationStatus: Selectors.getReplicationStatus(state),
          showPrivacyPolicy: Selectors.getShowPrivacyPolicy(state),
          unreadCount: Selectors.getUnreadCount(state),
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          openGuidedSetup: globalActions.openGuidedSetup,
          openTourSelect: globalActions.openTourSelect,
          setMinimalTabs: globalActions.setMinimalTabs
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      Tour.getTours().then(tours => ctrl.tours = tours);

      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'headerCtrl',
    bindToController: {
      adminUrl: '<',
      canLogOut: '<',
      tours: '<'
    }
  };
});
*/
