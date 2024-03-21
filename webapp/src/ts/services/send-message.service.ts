import { Injectable } from '@angular/core';
import { filter as _filter, flattenDeep as _flattenDeep, groupBy as _groupBy, uniqBy as _uniqBy } from 'lodash-es';
import { Dictionary } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import * as taskUtils from '@medic/task-utils';
import * as phoneNumber from '@medic/phone-number';
import { Store } from '@ngrx/store';

import { DbService } from '@mm-services/db.service';
import { MarkReadService } from '@mm-services/mark-read.service';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { ServicesActions } from '@mm-actions/services';

@Injectable({
  providedIn: 'root'
})
export class SendMessageService {
  private servicesActions: ServicesActions;

  constructor(
    private store: Store,
    private dbService: DbService,
    private markReadService: MarkReadService,
    private settingsService: SettingsService,
    private userSettingsService: UserSettingsService,
    private extractLineageService: ExtractLineageService
  ) {
    this.servicesActions = new ServicesActions(this.store);
  }

  private checkIdentity(id) {
    return !!id;
  }

  private createMessageDoc(user) {
    return {
      errors: [],
      form: null,
      from: user && user.phone,
      reported_date: Date.now(),
      tasks: [] as any[],
      kujua_message: true,
      type: 'data_record',
      sent_by: (user && user.name) || 'unknown',
      _id: uuidv4()
    };
  }

  private mapRecipient(contact, phone) {
    if (!phone) {
      return;
    }

    const res: any = { phone: phone };

    if (contact) {
      res.contact = contact;
    }

    return res;
  }

  private mapDescendants(results) {
    return results.rows
      .map(row => {
        const doc = row && row.doc ? row.doc : {};
        const phone = doc.phone || (doc.contact && doc.contact.phone);

        return this.mapRecipient(doc, phone);
      });
  }

  // Returns contacts and primary contacts for descendant hierarchies
  private getDescendants(recipient) {
    return this.dbService
      .get()
      .query('medic-client/contacts_by_parent', {
        include_docs: true,
        startkey: [ recipient.doc._id ],
        endkey: [ recipient.doc._id, {} ]
      })
      .then(contacts => {
        const primaryContacts =
          _filter(contacts.rows, ({ doc }) => doc && doc.contact && doc.contact._id && !doc.contact.phone)
            .map(row => ({ doc: { _id: row.doc.contact._id } }));

        if (primaryContacts) {
          return this
            .hydrate(primaryContacts)
            .then(primaries => _flattenDeep([ this.mapDescendants(contacts), primaries ]));
        }
        return this.mapDescendants(contacts);
      });
  }

  private hydrate(recipients) {
    const ids = recipients.map(recipient => recipient.doc._id);

    return this.dbService
      .get()
      .allDocs({ include_docs: true, keys: ids })
      .then(contacts => this.mapDescendants(contacts));
  }

  private resolvePhoneNumbers(recipients) {
    /** TODO: do we want to attempt to resolve phone numbers into existing contacts?
     * Users will have already gotten that suggestion in the send-message UI, if it exists in the DB
     */
    return recipients.map(recipient => {
      const phone =
        recipient.text || // from select2
        recipient.doc.phone ||
        recipient.doc.contact.phone; // from LHS message bar
      return this.mapRecipient(null, phone);
    });
  }

  private formatRecipients(recipients) {
    const splitRecipients: Dictionary<any[]> = _groupBy(recipients, (recipient) => {
      if (recipient.everyoneAt) {
        return 'explode';
      }
      if (recipient.doc && recipient.doc._id) {
        return 'hydrate';
      }
      return 'resolve';
    });

    splitRecipients.explode = splitRecipients.explode || [];
    splitRecipients.hydrate = splitRecipients.hydrate || [];
    splitRecipients.resolve = splitRecipients.resolve || [];

    const promises = _flattenDeep([
      splitRecipients.explode.map((recipients) => this.getDescendants(recipients)),
      this.hydrate(splitRecipients.hydrate),
      this.resolvePhoneNumbers(splitRecipients.resolve),
    ]);

    return Promise
      .all(promises)
      .then((recipients) => {
        // hydrate() and resolvePhoneNumbers() are promises with multiple values
        recipients = _flattenDeep(recipients);
        // removes any undefined values caused by bad data
        const validRecipients = recipients.filter(id => this.checkIdentity(id));

        return _uniqBy(validRecipients, (recipient) => recipient.phone);
      });
  }

  private createTask(settings, recipient, message, user) {
    const task = {
      messages: [
        {
          from: user && user.phone,
          sent_by: (user && user.name) || 'unknown',
          to: phoneNumber.normalize(settings, recipient.phone) || recipient.phone,
          contact: this.extractLineageService.extract(recipient.contact),
          message: message,
          uuid: uuidv4(),
        },
      ],
    };
    taskUtils.setTaskState(task, 'pending');
    return task;
  }

  send(recipients, message) {
    if (!Array.isArray(recipients)) {
      recipients = [recipients];
    }

    return Promise
      .all([ this.userSettingsService.get(), this.settingsService.get(), this.formatRecipients(recipients) ])
      .then(([ user, settings, explodedRecipients ]) => {
        const doc = this.createMessageDoc(user);
        doc.tasks = explodedRecipients.map(recipient => this.createTask(settings, recipient, message, user));
        this.servicesActions.setLastChangedDoc(doc);
        return doc;
      })
      .then(doc => {
        return Promise.all([
          this.dbService.get().post(doc),
          this.markReadService.markAsRead([ doc ])
        ]);
      });
  }
}
