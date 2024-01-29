import { Injectable } from '@angular/core';
import { find as _find, map as _map } from 'lodash-es';

import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';

@Injectable({
  providedIn: 'root'
})
export class HydrateMessagesService {

  constructor(private lineageModelGenerator: LineageModelGeneratorService) { }

  private buildMessageModel(doc, key, date, report) {
    let contact: any = null;
    let phone = null;
    let message = null;
    let outgoing = false;

    if (doc.kujua_message) {
      outgoing = true;
      const task = _find(doc.tasks, (task) => {
        const msg = task.messages[0];

        if (msg.contact) {
          return msg.contact._id === key;
        }

        return msg.to === key;
      });

      if (task && task.messages) {
        message = task.messages[0].message;
        contact = task.messages[0].contact;
        phone = task.messages[0].to;
      }
    } else if (doc.sms_message) {
      message = doc.sms_message.message;
      contact = doc.contact;
      phone = doc.from;
    }

    let type = 'unknown';
    let from = doc._id;

    if (contact) {
      type = 'contact';
      from = contact._id;
    } else if (phone) {
      type = 'phone';
      from = phone;
    }

    const lineage = report && _map(report.lineage, 'name');

    return {
      doc: doc,
      id: doc._id,
      key: key,
      contact: report && report.doc.name,
      lineage: lineage || [],
      outgoing: outgoing,
      from: from,
      date: date,
      type: type,
      message: message
    };
  }

  hydrate(rows) {
    if (!rows || rows.length <= 0) {
      return Promise.resolve([]);
    }

    const rowsObject = {};
    const contactIds: any[] = [];

    rows.forEach((row) => {
      rowsObject[row.key[0]] = row;

      if (row.value.contact) {
        contactIds.push(row.value.contact);
      }
    });

    return this.lineageModelGenerator
      .reportSubjects(contactIds)
      .then((reports) => {
        reports.forEach((report) => {
          if (rowsObject[report._id]) {
            // Adding report to each "row" by using reference in rowsObject.
            rowsObject[report._id].report = report;
          }
        });

        return rows.map((row) => {
          return this.buildMessageModel(row.doc || {}, row.key[0], row.value.date, row.report);
        });
      });
  }
}
