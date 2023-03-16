import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { TargetCheckpointerMigration } from '@mm-services/migrations/target-checkpointer.migration';

@Injectable({
  providedIn: 'root'
})
export class MigrationsService {
  constructor(
    private dbService:DbService,
    private targetCheckpointerMigration:TargetCheckpointerMigration,
  ) {
  }

  private runningMigrations;
  private migrations = [
    this.targetCheckpointerMigration
  ];

  private async run() {
    for (const migration of this.migrations) {
      if (!await migration.hasRun(this.dbService) && await migration.run()) {
        await migration.setHasRun(this.dbService);
      }
    }
    this.runningMigrations = false;
  }

  async runMigrations () {
    if (this.runningMigrations) {
      return await this.runningMigrations;
    }

    this.runningMigrations = this.run();

    return await this.runningMigrations;
  }
}
