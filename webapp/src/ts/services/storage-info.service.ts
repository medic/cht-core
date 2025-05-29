import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { StorageInfo, StorageStatus } from '@mm-reducers/global';

@Injectable({
  providedIn: 'root'
})
export class StorageInfoService {
  private readonly globalActions: GlobalActions;
  private timeout;

  constructor(private readonly store: Store) {
    this.globalActions = new GlobalActions(this.store);
  }

  init = () => this.pollStorageInfo();

  private readonly pollStorageInfo = async (): Promise<void> => {
    try {
      const info = await this.fetchStorageInfo();
      this.globalActions.updateStorageInfo(info);
    } catch (err) {
      console.error('Error updating storage info', err);
    } finally {
      this.timeout = setTimeout(this.pollStorageInfo, 30000);
    }
  };

  private async fetchStorageInfo(): Promise<StorageInfo> {
    try {
      const estimate = await navigator.storage.estimate();
      if (!estimate.quota || !estimate.usage) { 
        throw new Error('Quota or usage is undefined');
      }

      return {
        status: StorageStatus.NORMAL,
        availableBytes: estimate.quota - estimate.usage,
        storageUsagePercentage: (estimate.usage / estimate.quota) * 100,
      };
    } catch (error) {
      console.error('Storage estimate failed:', error);
      return {
        status: StorageStatus.ERROR,
        availableBytes: 0,
        storageUsagePercentage: 0,
      };
    }
  }

  stop = () => this.timeout && clearTimeout(this.timeout);

  static bytesToGB(bytes: number): string {
    return (bytes / 1024 / 1024 / 1024).toFixed(2);
  }

  static bytesToMB(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2);
  }
}
