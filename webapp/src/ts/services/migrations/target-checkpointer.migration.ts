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
    return await generateReplicationId(source, target, {});
  }

  private async getLocalCheckpointerDoc() {
    const replicationId = await this.getCheckpointerId();
    if (!replicationId) {
      return;
    }

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
    console.info('Running target checkpointer migration');
    const localDoc = await this.getLocalCheckpointerDoc();
    if (!localDoc) {
      return false;
    }

    try {
      await this.dbService.get({ remote: true }).put(localDoc);
      return true;
    } catch (err) {
      if (err?.status === 409) {
        // dont fail on conflicts
        return true;
      }
      throw err;
    }
  }
}
