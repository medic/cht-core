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
    const replicationId = await generateReplicationId(source, target, {});
    return replicationId;
  }

  private async getLocalCheckpointerDoc() {
    const replicationId = await this.getCheckpointerId();
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
    if (!localDoc) {
      return;
    }
    await this.dbService.get({ remote: true }).put(localDoc);
  }
}
