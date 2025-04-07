import { Injectable } from '@angular/core';
import { Observable, interval, switchMap, shareReplay, from } from 'rxjs';

export enum StorageStatus {
  STARTUP,
  NORMAL,
  ERROR
}
export interface StorageInfo {
  status: StorageStatus,
  availableBytes: number;
  storageUsagePercentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageInfoService {
  private readonly storageInfoInternal$: Observable<StorageInfo>;

  constructor() {
    this.storageInfoInternal$ = new Observable<StorageInfo>(subscriber => {
      this.fetchStorageInfo().then(info => subscriber.next(info));

      const polling = interval(30000)
        .pipe(switchMap(() => from(this.fetchStorageInfo())))
        .subscribe(subscriber);

      return () => polling.unsubscribe();
    }).pipe(shareReplay(1));
  }

  get storageInfo$(): Observable<StorageInfo> {
    return this.storageInfoInternal$;
  }

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

  static bytesToGB(bytes: number): string {
    return (bytes / 1024 / 1024 / 1024).toFixed(2);
  }

  static bytesToMB(bytes: number): string {
    return (bytes / 1024 / 1024).toFixed(2);
  }
}
