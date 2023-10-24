import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { HydrateMessagesService } from '@mm-services/hydrate-messages.service';
import { AddReadStatusService } from '@mm-services/add-read-status.service';

@Injectable({
  providedIn: 'root'
})
export class MessageContactService {
  minLimit = 50;

  constructor(
    private dbService: DbService,
    private getDataRecordsService: GetDataRecordsService,
    private hydrateMessagesService: HydrateMessagesService,
    private addReadStatusService: AddReadStatusService
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
      .then((rows) => this.hydrateMessagesService.hydrate(rows));
  }

  getList(): Promise<Record<string, any>[]> {
    return this.getMessages(this.listParams())
      .then(response => this.addReadStatusService.updateMessages(response));
  }

  getConversation(id, skip = 0, limit = 0) {
    return this.getMessages(this.conversationParams(id, skip, limit))
      .then(response => this.addReadStatusService.updateMessages(response));
  }

  isRelevantChange(change, conversation?) {
    return (change.doc && change.doc.kujua_message) ||
      (change.doc && change.doc.sms_message) ||
      change.deleted ||
      (conversation && conversation.messages && conversation.messages.find(message => message.doc._id === change.id));
  }
}
