import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { appendToPurgeList } from '../../js/bootstrapper/purger';

const PURGE_REQUEST_DELAY = 1000; // 1 second

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
    return this.http.get('/purging/changes?limit=1000').toPromise();
  }

  private checkpoint(seq) {
    if (seq) {
      return this.http.get('/purging/checkpoint', { params: { seq } }).toPromise();
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
    setTimeout(() => { // TODO remove this now with 1000 limit?
      this.updateDocsToPurgeRecursively();
    }, PURGE_REQUEST_DELAY);
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
