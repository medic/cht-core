import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { DbService } from './db.service';
import { HttpClient } from '@angular/common/http';
import { RulesEngineService } from '@mm-services/rules-engine.service';
import { DOC_IDS, DOC_TYPES } from '@medic/constants';

const READ_ONLY_TYPES = ['form', DOC_TYPES.TRANSLATIONS];
const READ_ONLY_IDS = [
  DOC_IDS.RESOURCES,
  'branding',
  DOC_IDS.SERVICE_WORKER_META,
  'zscore-charts',
  DOC_IDS.SETTINGS,
  DOC_IDS.PARTNERS
];
const DDOC_PREFIX = '_design/';
const LAST_PUSH_SEQ_KEY = 'medic-last-push-seq';

@Injectable({
  providedIn: 'root'
})
export class ReplicationService {
  constructor(
    private dbService:DbService,
    private http:HttpClient,
    private rulesEngineService:RulesEngineService,
  ) {
  }

  private readonly BATCH_SIZE=100;

  async replicateFrom():Promise<{ read_docs: number }> {
    const remoteDocIdsRevs = await this.getRemoteDocs();
    const localDocs = await this.dbService.get().allDocs();

    const localIdRevMap = Object.assign({}, ...localDocs.rows.map(row => ({ [row.id]: row.value?.rev })));
    const remoteIdRevMap = Object.assign({}, ...remoteDocIdsRevs.map(({ id, rev }) => ({ [id]: rev })));

    const nbrDownloaded = await this.getMissingDocs(localIdRevMap, remoteDocIdsRevs);
    const nbrDeleted = await this.getDeletesAndPurges(localIdRevMap, remoteIdRevMap);
    return { read_docs: nbrDeleted + nbrDownloaded };
  }

  private async getRemoteDocs():Promise<{ id; rev }[]> {
    const getIdsReq = this.http.get<{ doc_ids_revs: { id; rev }[]}>(
      '/api/v1/replication/get-ids',
      { responseType: 'json' }
    );
    const response = await lastValueFrom(getIdsReq);
    return response.doc_ids_revs;
  }

  private async getMissingDocs(localIdRevMap, remoteDocIdsRevs):Promise<number> {
    const docIdRevsToDownload = remoteDocIdsRevs
      .filter(({ id, rev }) => !localIdRevMap[id] || localIdRevMap[id] !== rev);
    const nbrDocs = docIdRevsToDownload.length;

    while (docIdRevsToDownload.length) {
      const batch = docIdRevsToDownload.splice(0, this.BATCH_SIZE);
      await this.downloadDocsBatch(batch);
    }

    return nbrDocs;
  }

  private async getDeletesAndPurges(localIdRevMap, remoteIdRevMap):Promise<number> {
    const missingRemoteIds = Object.keys(localIdRevMap).filter(id => !remoteIdRevMap[id]);
    let nbrDeletes = 0;

    while (missingRemoteIds.length) {
      const batch = missingRemoteIds.splice(0, this.BATCH_SIZE);
      const getDeleteListReq =  this.http.post<{ doc_ids: []}>(
        '/api/v1/replication/get-deletes',
        { doc_ids: batch },
        { responseType: 'json' }
      );
      const localIdsToDelete = (await lastValueFrom(getDeleteListReq)).doc_ids;
      const deleteDocs = localIdsToDelete
        .map(id => ({ _id: id, _rev: localIdRevMap[id], _deleted: true, purged: true }));
      await this.dbService.get().bulkDocs(deleteDocs);
      nbrDeletes += deleteDocs.length;
    }
    return nbrDeletes;
  }

  private async downloadDocsBatch(batch):Promise<void> {
    const res = await this.dbService.get({ remote: true }).bulkGet({ docs: batch, attachments: true, revs: true });
    const docs = res.results
      .map(result => result.docs && result.docs[0] && result.docs[0].ok)
      .filter(doc => doc);
    await this.dbService.get().bulkDocs(docs, { new_edits: false });
    this.rulesEngineService.monitorExternalChanges({ docs });
  }

  async replicateTo():Promise<{ docs_written: number }> {
    const lastPushSeq = this.getLastPushSeq();
    const changes = await this.dbService.get().changes({
      since: lastPushSeq,
      include_docs: true,
    });

    const docsToUpload = changes.results
      .filter(change => change.doc && this.isUploadable(change.doc))
      .map(change => change.doc);

    let docsWritten = 0;
    let docsFailed = 0;
    const docsCopy = [...docsToUpload];
    while (docsCopy.length) {
      const batch = docsCopy.splice(0, this.BATCH_SIZE);
      const results = await this.pushDocsBatch(batch);
      docsWritten += results.filter(r => r.ok).length;
      docsFailed += results.filter(r => !r.ok && r.error).length;
    }

    // Only advance the checkpoint if all pushable docs succeeded.
    // If any failed, keep the old seq so they get retried next sync.
    if (docsFailed === 0) {
      this.setLastPushSeq(changes.last_seq);
    } else {
      console.warn(`Push: ${docsFailed} docs failed, keeping seq at ${lastPushSeq} for retry`);
    }

    return { docs_written: docsWritten };
  }

  private isUploadable(doc):boolean {
    if (!doc._id) {
      return false;
    }

    // Never replicate purged documents upwards
    const keys = Object.keys(doc);
    if (keys.length === 4 &&
      keys.includes('_id') &&
      keys.includes('_rev') &&
      keys.includes('_deleted') &&
      keys.includes('purged')) {
      return false;
    }

    return (
      READ_ONLY_TYPES.indexOf(doc.type) === -1 &&
      READ_ONLY_IDS.indexOf(doc._id) === -1 &&
      !doc._id.startsWith(DDOC_PREFIX)
    );
  }

  private async pushDocsBatch(docs):Promise<any[]> {
    const pushReq = this.http.post<{ results: any[] }>(
      '/api/v1/replication/push-docs',
      { docs },
      { responseType: 'json' }
    );
    const response = await lastValueFrom(pushReq);
    return response.results;
  }

  private getLastPushSeq():number {
    const seq = window.localStorage.getItem(LAST_PUSH_SEQ_KEY);
    return seq ? Number(seq) : 0;
  }

  private setLastPushSeq(seq) {
    if (seq !== undefined && seq !== null) {
      window.localStorage.setItem(LAST_PUSH_SEQ_KEY, String(seq));
    }
  }
}
