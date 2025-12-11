import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { DbService } from './db.service';
import { HttpClient } from '@angular/common/http';
import { RulesEngineService } from '@mm-services/rules-engine.service';
const { DOC_IDS_PREFIX } = require('@medic/constants');

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
    const docIdRevsToDownload:{ id, rev }[] = [];
    const formsToDownload:{ id, rev }[] = [];

    for (const { id, rev } of remoteDocIdsRevs) {
      if (!localIdRevMap[id] || localIdRevMap[id] !== rev) {
        if (id.startsWith(DOC_IDS_PREFIX.FORM)) {
          formsToDownload.push({ id, rev });
        } else {
          docIdRevsToDownload.push({ id, rev });
        }
      }
    }

    const nbrDocs = docIdRevsToDownload.length + formsToDownload.length;

    while (docIdRevsToDownload.length) {
      const batch = docIdRevsToDownload.splice(0, this.BATCH_SIZE);
      await this.downloadDocsBatch(batch);
    }

    await this.downloadForms(formsToDownload);

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

  private async downloadForms(formsToDownload):Promise<void> {
    for (const form of formsToDownload) {
      const formDoc = await this.dbService.get({ remote: true }).get(form.id, { attachments: true, revs: true });
      await this.dbService.get().bulkDocs([ formDoc, { new_edits: false } ]);
    }
  }
}
