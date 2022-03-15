import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { TO_PURGE_LIST_KEY } from '../../js/bootstrapper/purger';

@Injectable({
  providedIn: 'root'
})
export class PurgeService {
  constructor(
    private http:HttpClient,
  ) {
  }

  private needsUpdating = true;

  private getToPurgeList() {
    const stored = window.localStorage.getItem(TO_PURGE_LIST_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private setToPurgeList(list) {
    const unique = Array.from(new Set(list));
    window.localStorage.setItem(TO_PURGE_LIST_KEY, JSON.stringify(unique));
  }

  private changesFetch() {
    return this.http.get('/purging/changes').toPromise();
  }

  private checkpoint(seq) {
    if (seq) {
      return this.http.get('purging/checkpoint', { params: { seq } }).toPromise();
    }
  }

  private async updateDocsToPurgeRecursively() {
    const response:any = await this.changesFetch();
    const { purged_ids: ids, last_seq: lastSeq } = response;
    if (!ids || !ids.length) {
      return;
    }
    const toPurgeList = this.getToPurgeList();
    toPurgeList.push(...ids);
    this.setToPurgeList(toPurgeList);
    await this.checkpoint(lastSeq);
    setTimeout(this.updateDocsToPurgeRecursively, 1000);
  }

  async updateDocsToPurge() {
    if (this.needsUpdating) {
      this.needsUpdating = false; // check once per session
      try {
        await this.updateDocsToPurgeRecursively();
      } catch(e) {
        console.info('Error fetching purge list', e);
      }
    }
  }
}
