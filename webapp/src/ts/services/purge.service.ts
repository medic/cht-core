import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { appendToPurgeList } from '../../js/bootstrapper/purger';
import { POUCHDB_OPTIONS } from '../constants';

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
    const headers = new HttpHeaders({
      'medic-replication-id': POUCHDB_OPTIONS.remote_headers['medic-replication-id']
    });
    return this.http.get('/purging/changes', { headers }).toPromise();
  }

  private checkpoint(seq) {
    if (seq) {
      const headers = new HttpHeaders({
        'medic-replication-id': POUCHDB_OPTIONS.remote_headers['medic-replication-id']
      });
      return this.http.get('/purging/checkpoint', { params: { seq }, headers }).toPromise();
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
    return this.updateDocsToPurgeRecursively();
    // TODO do something better here - just trying to get the e2e test passing
    //setTimeout(() => {
    //  this.updateDocsToPurgeRecursively();
    // TODO do we want to iterate or just increase the limit for the request?
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
