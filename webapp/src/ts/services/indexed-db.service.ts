import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private readonly LOCAL_DOC = '_local/indexeddb-placeholder';
  private loadingLocalDoc: Promise<IndexedDBDoc> | undefined;
  private hasDatabasesFn: boolean;
  private isUpdatingLocalDoc?: boolean;

  constructor(
    private dbService: DbService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    // Firefox doesn't support the databases() function. Issue: https://github.com/medic/cht-core/issues/8777
    this.hasDatabasesFn = !!this.document.defaultView?.indexedDB?.databases;
  }

  async getDatabaseNames() {
    if (this.hasDatabasesFn) {
      const databases = await this.document.defaultView?.indexedDB?.databases();
      return databases?.map(db => db.name);
    }

    const doc = await this.getLocalDoc();
    return doc?.db_names || [];
  }

  async saveDatabaseName(name: string) {
    if (this.hasDatabasesFn || this.isUpdatingLocalDoc) {
      return;
    }

    this.isUpdatingLocalDoc = true;
    const localDoc = await this.getLocalDoc();
    if (localDoc.db_names.indexOf(name) > -1) {
      this.isUpdatingLocalDoc = false;
      return;
    }

    localDoc.db_names.push(name);
    await this.updateLocalDoc(localDoc);
    this.isUpdatingLocalDoc = false;
  }

  async deleteDatabaseName(name: string) {
    if (this.hasDatabasesFn || this.isUpdatingLocalDoc) {
      return;
    }

    this.isUpdatingLocalDoc = true;
    const localDoc = await this.getLocalDoc();
    const dbNameIdx = localDoc.db_names.indexOf(name);
    if (dbNameIdx === -1) {
      this.isUpdatingLocalDoc = false;
      return;
    }

    localDoc.db_names.splice(dbNameIdx, 1);
    await this.updateLocalDoc(localDoc);
    this.isUpdatingLocalDoc = false;
  }

  private async updateLocalDoc(localDoc) {
    await this.dbService
      .get({ meta: true })
      .put(localDoc);
    this.loadingLocalDoc = undefined; // To fetch again and get the new doc's _rev number.
  }

  private async getLocalDoc(): Promise<IndexedDBDoc> {
    // Avoids "Failed to execute transaction on IDBDatabase" exception.
    if (!this.loadingLocalDoc) {
      this.loadingLocalDoc = this.dbService
        .get({ meta: true })
        .get(this.LOCAL_DOC);
    }

    let localDoc;
    try {
      localDoc = await this.loadingLocalDoc;
    } catch (error) {
      if (error.status !== 404) {
        throw error;
      }
      console.debug('IndexedDbService :: Local doc not created yet. Ignoring error.');
    }
    return localDoc ? { ...localDoc } : { _id: this.LOCAL_DOC, db_names: [] };
  }
}

interface IndexedDBDoc {
  _id: string;
  db_names: string[];
}
