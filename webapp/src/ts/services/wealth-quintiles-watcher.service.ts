/**
 *  This eventually needs to be improved by adding features currently in
 *  server-side sentinel such as keeping track of seq numbers (possibly
 *  becoming a client-side sentinel style service).
 */

import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { ChangesService } from '@mm-services/changes.service';
import { DbService } from '@mm-services/db.service';

@Injectable({
  providedIn: 'root'
})
export class WealthQuintilesWatcherService implements OnDestroy {
  subscriptions: Subscription = new Subscription();

  constructor(
    private changesService: ChangesService,
    private dbService: DbService
  ) { }

  start() {
    const subscription = this.changesService.subscribe({
      key: 'wealth-quintiles',
      filter: (change:any) => !!(change?.doc?.fields && 'NationalQuintile' in change.doc.fields),
      callback: (change:any) => this.updateDocs(change)
    });
    this.subscriptions.add(subscription);
  }

  private updateDocs(change:any) {
    const fields = change.doc.fields;

    this.dbService
      .get()
      .query('medic-client/contacts_by_parent', {
        startkey: [ fields.place_id ],
        endkey: [ fields.place_id, {} ],
        include_docs: true
      })
      .then((result:any) => {
        const updatedDocs:any = [];

        result.rows.forEach((row:any) => {
          if (row.doc.wealth_quintile_national === fields.NationalQuintile
            && row.doc.wealth_quintile_urban === fields.UrbanQuintile) {
            return;
          }

          updatedDocs.push({
            ...row.doc,
            wealth_quintile_national: fields.NationalQuintile,
            wealth_quintile_urban: fields.UrbanQuintile
          });
        });

        return this.dbService
          .get()
          .bulkDocs(updatedDocs);
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
