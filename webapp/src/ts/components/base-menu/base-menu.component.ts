import { Directive, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { DBSyncService } from '@mm-services/db-sync.service';
import { ModalService } from '@mm-services/modal.service';
import { LogoutConfirmComponent } from '@mm-modals/logout/logout-confirm.component';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';

import { StorageInfo, StorageStatus } from '@mm-reducers/global';
import { StorageInfoService } from '@mm-services/storage-info.service';

@Directive()
export abstract class BaseMenuComponent implements OnInit, OnDestroy {
  protected subscriptions = new Subscription();
  protected replicationStatus;
  protected storageInfo?: StorageInfo;

  constructor(
    protected store: Store,
    protected dbSyncService: DBSyncService,
    protected modalService: ModalService,
    protected storageInfoService: StorageInfoService
  ) {}

  ngOnInit(): void {
    this.subscribeToStore();
    this.storageInfoService.init();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.storageInfoService.stop();
  }

  logout() {
    this.modalService.show(LogoutConfirmComponent);
  }

  openFeedback() {
    this.modalService.show(FeedbackComponent);
  }

  replicate() {
    this.dbSyncService.sync(true);
  }

  protected subscribeToStore() {
    const replicationSub = this.store.select(Selectors.getReplicationStatus)
      .subscribe(status => this.replicationStatus = status);
    const storageInfoSub = this.store.select(Selectors.getStorageInfo)
      .subscribe(info => this.storageInfo = info);
    this.subscriptions.add(replicationSub);
    this.subscriptions.add(storageInfoSub);
  }

  get storagePressureClass(): string {
    const val = this.storageInfo?.storageUsagePercentage ?? 0;
    if (val < 50) {
      return 'progress-bar-green';
    } else if (val < 75) {
      return 'progress-bar-yellow';
    }
    return 'progress-bar-red';
  }

  get availableStorageSpace(): string {
    switch (this.storageInfo?.status) {
    case StorageStatus.NORMAL:
      return `${StorageInfoService.bytesToGB(this.storageInfo?.availableBytes)} GB`;
    case StorageStatus.STARTUP:
      return 'Calculating...';
    default:
      return 'Error calculating available space';
    }
  }

  get storageUsagePercentage(): number {
    return this.storageInfo?.storageUsagePercentage ?? 0;
  }
}
