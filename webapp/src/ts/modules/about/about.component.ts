import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { DbService } from '@mm-services/db.service';
import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { Selectors } from '@mm-selectors/index';
import { SessionService } from "@mm-services/session.service";
import { VersionService } from '@mm-services/version.service';

@Component({
  templateUrl: './about.component.html'
})
export class AboutComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  private dataUsageUpdate;

  userCtx;
  replicationStatus;
  androidAppVersion;
  partners;
  androidDataUsage;
  version;
  localRev;
  remoteRev;
  dbInfo;
  url;

  constructor(
    private dbService: DbService,
    private store: Store,
    private resourceIconsService: ResourceIconsService,
    private sessionService: SessionService,
    private versionService: VersionService,
    private translateService: TranslateService,
  ) {
  }

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getReplicationStatus),
      this.store.select(Selectors.getAndroidAppVersion),
    ).subscribe(([ replicationStatus, androidAppVersion ]) => {
      this.replicationStatus = replicationStatus;
      this.androidAppVersion = androidAppVersion;
    });
    this.subscription.add(reduxSubscription);

    this.userCtx = this.sessionService.userCtx();
    this.resourceIconsService.getDocResources('partners').then(partners => {
      this.partners = partners;
    });

    this.versionService
      .getLocal()
      .then(({ version, rev }) => {
        this.version = version;
        this.localRev = rev;
      })
      .catch((err) => {
        console.error('Could not access local version', err);
      });

    this.versionService
      .getRemoteRev()
      .catch((err) => {
        console.debug('Could not access remote ddoc rev', err);
        return this.translateService.get('app.version.unknown').toPromise();
      })
      .then(rev => this.remoteRev = rev);

    if ((<any>window).medicmobile_android && typeof (<any>window).medicmobile_android.getDataUsage === 'function') {
      this.updateAndroidDataUsage();
      this.dataUsageUpdate = setInterval(this.updateAndroidDataUsage, 2000);
    }

    this.dbService.get()
      .info()
      .then((result) => {
        this.dbInfo = result;
      })
      .catch((err) => {
        console.error('Failed to fetch DB info', err);
      });
  }

  ngOnDestroy() {
    clearInterval(this.dataUsageUpdate);
    this.subscription.unsubscribe();
  }

  private updateAndroidDataUsage() {
    this.androidDataUsage = JSON.parse((<any>window).medicmobile_android.getDataUsage());
  }

  reload() {
    window.location.reload(false);
  };

  // todo testing!
  secretDoor() {

  }
}
/*
angular.module('inboxControllers').controller('AboutCtrl',
  function (
    $interval,
    $log,
    $ngRedux,
    $scope,
    $state,
    $timeout,
    $translate,
    $window,
    DB,
    ResourceIconsService,
    Selectors,
    SessionService,
    VersionService
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;
    const mapStateToTarget = state => ({
      androidAppVersion: Selectors.getAndroidAppVersion(state),
      replicationStatus: Selectors.getReplicationStatus(state)
    });

    const unsubscribe = $ngRedux.connect(mapStateToTarget)(ctrl);




    ctrl.knockCount = 0;
    ctrl.secretDoor = () => {
      if (ctrl.doorTimeout) {
        $timeout.cancel(ctrl.doorTimeout);
      }
      if (ctrl.knockCount++ >= 5) {
        $state.go('testing');
      } else {
        ctrl.doorTimeout = $timeout(() => {
          ctrl.knockCount = 0;
        }, 1000);
      }
    };






    $scope.$on('$destroy', unsubscribe);
  }
);
*/
