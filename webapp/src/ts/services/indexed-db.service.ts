import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private hasDatabasesFn = true;
  private readonly LOCAL_DOC = '_local/indexeddb-placeholder';

  constructor(
    private dbService: DbService,
    @Inject(DOCUMENT) private document: Document
  ) {
    // Firefox doesn't support the databases() function. Issue: https://github.com/medic/cht-core/issues/8777
    this.hasDatabasesFn = !!this.document.defaultView?.indexedDB?.databases;
  }

  async getDatabaseNames() {
    if (this.hasDatabasesFn) {
      const databases = await this.document.defaultView!.indexedDB.databases();
      return databases.map(db => db.name);
    }

    const doc = await this.dbService
      .get({ meta: true })
      .get(this.LOCAL_DOC);
    return doc?.db_names;
  }

  async saveDatabaseName(name: string) {
    if (this.hasDatabasesFn || !name) {
      return;
    }

    const dbNames = (await this.getDatabaseNames()) || [];
    if (dbNames.find(dbName => dbName === name)) {
      return;
    }

    dbNames.push(name);
    this.updateLocalDoc(dbNames);
  }

  async deleteDatabaseName(name: string) {
    if (this.hasDatabasesFn || !name) {
      return;
    }

    const dbNames = await this.getDatabaseNames();
    if (!dbNames?.length) {
      return;
    }

    const dbNameIdx = dbNames?.indexOf(name);
    if (dbNameIdx < 0) {
      return;
    }

    dbNames.splice(dbNameIdx, 1);
    this.updateLocalDoc(dbNames);
  }

  private updateLocalDoc(dbNames: string[]) {
    return this.dbService
      .get({ meta: true })
      .put({ _id: this.LOCAL_DOC, db_names: dbNames });
  }
}
