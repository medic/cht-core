import { Injectable } from '@angular/core';

import { DbService } from './db.service';
import { GetDataRecordsService } from './get-data-records.service';
import { HydrateMessagesService } from './hydrate-messages.service';

@Injectable({
  providedIn: 'root'
})
export class MessageContactService {
  minLimit = 50;

  constructor(
    private dbService: DbService,
    private getDataRecordsService: GetDataRecordsService,
    private hydrateMessages: HydrateMessagesService
  ) { }

  private listParams() {
    return { group_level: 1 };
  }

  private conversationParams(id, skip, limit = 0) {
    return {
      reduce: false,
      descending: true,
      include_docs: true,
      skip: skip,
      limit: Math.max(limit, this.minLimit),
      startkey: [id, {}],
      endkey: [id],
    };
  }

  private getMessages(params) {
    return this.dbService
      .get()
      .query('medic-client/messages_by_contact_date', params)
      .then(response => {
        if (!response.rows) {
          return [];
        }

        if (params.reduce !== undefined && params.reduce !== true) {
          return response.rows;
        }

        //include_docs on reduce views (listParams)
        const ids = response.rows.map(row => row.value && row.value.id);

        return this.getDataRecordsService
          .get(ids, {include_docs: true})
          .then(docs => {
            response.rows.forEach((row, idx) => row.doc = docs[idx]);
            return response.rows;
          });
      })
      .then((rows) => this.hydrateMessages.hydrate(rows));
  }

  private getKeys(models = []) {
    return models.map(model => {
      const id = model.id || model._id;
      return [ 'read', 'message', id ].join(':');
    });
  }

  /**
   * Update message view models
   * @memberof AddReadStatus
   * @param {Object[]} models The models to mark as read
   * @returns {Promise} A Promise to return updated models
   */
  private addReadStatus(models = []) {
    if (!models.length) {
      return Promise.resolve(models);
    }

    const keys = this.getKeys(models);

    return this.dbService
      .get({ meta: true })
      .allDocs({ keys: keys })
      .then((response) => {
        models.forEach((model, i) => {
          const row = response.rows[i];
          model.read = !!(row.value && !row.value.deleted); // doc exists.
        });

        return models;
      });
  }

  getList() {
    return this.getMessages(this.listParams())
      .then(response => this.addReadStatus(response));
  }

  getConversation(id, skip = 0, limit = 0) {
    return this.getMessages(this.conversationParams(id, skip, limit))
      .then(response => this.addReadStatus(response));
  }

  isRelevantChange(change, conversation?) {
    return (change.doc && change.doc.kujua_message)
      || (change.doc && change.doc.sms_message)
      || change.deleted
      || (conversation && conversation.messages && conversation.messages.find(message => message.doc._id === change.id));
  }
}
