import { Injectable } from '@angular/core';
import * as generateReplicationId from 'pouchdb-generate-replication-id';

import { Migration } from './migration';

@Injectable({
  providedIn: 'root'
})
export class TargetCheckpointerMigration extends Migration {
  public name = 'checkpointer';
  constructor(
  ) {
    super();
  }

  private async getCheckpointerId () {
    const source = this.dbService.get();
    const target = this.dbService.get({ remote: true });
    const replicationId = await generateReplicationId(source, target);
    return replicationId;
  }

  private async getLocalCheckpointerDoc() {
    const replicationId = await this.getCheckpointerId();
    const checkpointerId = `_local/${replicationId}`;
    try {
      return await this.dbService.get().get(checkpointerId);
    } catch (err) {
      if (err.code === 404) {
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
