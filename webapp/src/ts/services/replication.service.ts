import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { DbService } from './db.service';
import { HttpClient } from '@angular/common/http';

const BATCH_SIZE = 100;

@Injectable({
  providedIn: 'root'
})
export class ReplicationService {
  constructor(
    private dbService:DbService,
    private http:HttpClient,
  ) {
  }

  async replicateFrom() {
    try {
      const remoteDocIdsRevs = await this.getRemoteDocs();
      const localDocs = await this.dbService.get().allDocs();

      const localIdRevMap = Object.assign({}, ...localDocs.rows.map(row => ({ [row.id]: row.value?.rev })));
      const remoteIdRevMap = Object.assign({}, ...remoteDocIdsRevs.map(({ id, rev }) => ({ [id]: rev })));

      await this.getMissingDocs(localIdRevMap, remoteDocIdsRevs);
      await this.getDeletesAndPurges(localIdRevMap, remoteIdRevMap);
    } catch (err) {
      return err;
    }
  }

  private async getRemoteDocs() {
    const getIdsReq = this.http.get<{ doc_ids_revs: { id; rev }[]}>(
      '/api/v1/replication/get-ids',
      { responseType: 'json' }
    );
    const response = await lastValueFrom(getIdsReq);
    return response.doc_ids_revs;
  }

  private async getMissingDocs(localIdRevMap, remoteDocIdsRevs) {
    const docIdRevsToDownload = remoteDocIdsRevs
      .filter(({ id, rev }) => !localIdRevMap[id] || localIdRevMap[id] !== rev);

    do {
      const batch = docIdRevsToDownload.splice(0, BATCH_SIZE);
      await this.downloadDocsBatch(batch);
    } while (docIdRevsToDownload.length > 0);
  }

  private async getDeletesAndPurges(localIdRevMap, remoteIdRevMap) {
    const missingRemoteIds = Object.keys(localIdRevMap).filter(id => !remoteIdRevMap[id]);

    const getDeleteListReq =  this.http.post<{ doc_ids: []}>(
      '/api/v1/replication/get-deletes',
      { doc_ids: missingRemoteIds },
      { responseType: 'json' }
    );
    const localIdsToDelete = (await lastValueFrom(getDeleteListReq)).doc_ids;
    const deleteDocs = localIdsToDelete.map(id => ({ _id: id, _rev: localIdRevMap[id], _deleted: true, purged: true }));
    await this.dbService.get().bulkDocs(deleteDocs);
  }

  private async downloadDocsBatch (batch) {
    if (!batch.length) {
      return;
    }

    const res = await this.dbService.get({ remote: true }).bulkGet({ docs: batch, attachments: true });
    const docs = res.results
      .map(result => result.docs && result.docs[0] && result.docs[0].ok)
      .filter(doc => doc);
    await this.dbService.get().bulkDocs(docs, { new_edits: false });
  }
}
