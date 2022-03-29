import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DbService } from '@mm-services/db.service';
import { appendToPurgeList } from '../../js/bootstrapper/purger';
import { POUCHDB_OPTIONS } from '../constants';

const TO_PURGE_LIMIT = 1000;

@Injectable({
  providedIn: 'root'
})
export class PurgeService {
  constructor(
    private http:HttpClient,
    private dbService:DbService,
  ) {
  }

  private needsUpdating = true;

  private getHeaders = () => {
    return new HttpHeaders({
      'medic-replication-id': POUCHDB_OPTIONS.remote_headers['medic-replication-id']
    });
  };

  private changesFetch() {
    const opts = {
      params: { limit: TO_PURGE_LIMIT },
      headers: this.getHeaders()
    };
    return this.http.get('/purging/changes', opts).toPromise();
  }

  private checkpoint(seq) {
    if (seq) {
      const opts = {
        params: { seq },
        headers: this.getHeaders()
      };
      return this.http.get('/purging/checkpoint', opts).toPromise();
    }
  }

  async updateDocsToPurge() {
    if (!this.needsUpdating) {
      return;
    }
    this.needsUpdating = false; // check once per session
    try {
      const response:any = await this.changesFetch();
      const { purged_ids: ids, last_seq: lastSeq } = response;
      if (!ids || !ids.length) {
        return;
      }
      await appendToPurgeList(this.dbService.get(), ids);
      await this.checkpoint(lastSeq);
    } catch(e) {
      console.info('Error fetching purge list', e);
    }
  }
}
