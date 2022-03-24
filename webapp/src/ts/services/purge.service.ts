import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { appendToPurgeList } from '../../js/bootstrapper/purger';

// const PURGE_REQUEST_DELAY = 1000; // 1 second

@Injectable({
  providedIn: 'root'
})
export class PurgeService {
  constructor(
    private http:HttpClient,
  ) {
  }

  private needsUpdating = true;

  private changesFetch() {
    return this.http.get('/purging/changes').toPromise();
  }

  private checkpoint(seq) {
    if (seq) {
      return this.http.get('/purging/checkpoint', { params: { seq } }).toPromise(); // TODO this is 400ing? needs the replication id param
    }
  }

  private async updateDocsToPurgeRecursively() {
    const response:any = await this.changesFetch();
    const { purged_ids: ids, last_seq: lastSeq } = response;
    if (!ids || !ids.length) {
      return;
    }
    const full = appendToPurgeList(ids);
    await this.checkpoint(lastSeq);
    if (full) {
      return;
    }
    return this.updateDocsToPurgeRecursively(); // TODO do something better here - just trying to get the e2e test passing
    //setTimeout(() => {
    //  this.updateDocsToPurgeRecursively(); // TODO do we want to iterate or just increase the limit for the request?
    //}, PURGE_REQUEST_DELAY);
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
