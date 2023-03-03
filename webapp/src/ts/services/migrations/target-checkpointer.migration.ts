import { Injectable } from '@angular/core';
import { default as generateReplicationId } from 'pouchdb-generate-replication-id';

import { Migration } from './migration';
import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class TargetCheckpointerMigration extends Migration {
  public name = 'checkpointer';
  constructor(
    private dbService:DbService,
  ) {
    super();
  }

  private async getCheckpointerId () {
    const source = this.dbService.get();
    const target = this.dbService.get({ remote: true });
    const targetId = await target.id();
    console.warn(targetId);
    const replicationId = await generateReplicationId(source, target, {});
    return replicationId;
  }

  private async getLocalCheckpointerDoc() {
    const replicationId = await this.getCheckpointerId();
    console.warn(replicationId, 'replicationId');
    try {
      return await this.dbService.get().get(replicationId);
    } catch (err) {
      if (err?.status === 404) {
        return;
      }
      throw err;
    }
  }

  async run() {
    const localDoc = await this.getLocalCheckpointerDoc();
    console.warn(localDoc, 'localDoc');
    if (!localDoc) {
      return;
    }
    try {
      await this.dbService.get({ remote: true }).put(localDoc);
    } catch (err) {
      if (err?.status === 409) {
        // dont fail on conflicts
        return;
      }
      throw err;
    }
  }
}
