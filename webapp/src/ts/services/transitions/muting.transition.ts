import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { ContactMutedService } from '@mm-services/contact-muted.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TransitionInterface } from '@mm-services/transitions/transition';
import { ValidationService } from '@mm-services/validation.service';

@Injectable({
  providedIn: 'root'
})
export class MutingTransition implements TransitionInterface {
  constructor(
    private dbService:DbService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private contactMutedService:ContactMutedService,
    private contactTypesService:ContactTypesService,
    private validationService:ValidationService,
  ) { }

  readonly name = 'muting';

  private transitionConfig;
  private readonly CONFIG_NAME = 'muting';
  private readonly MUTE_PROPERTY = 'mute_forms';
  private readonly UNMUTE_PROPERTY = 'unmute_forms';
  private readonly OFFLINE = 'offline';

  private loadSettings(settings = {}) {
    this.transitionConfig = settings[this.CONFIG_NAME] || {};
  }

  private getMutingForms() {
    return this.transitionConfig[this.MUTE_PROPERTY];
  }

  private getUnmutingForms() {
    return this.transitionConfig[this.UNMUTE_PROPERTY];
  }

  init(settings) {
    this.loadSettings(settings);
    if (!this.transitionConfig.offline_muting) {
      return false;
    }

    const mutingForms = this.getMutingForms();
    if (!mutingForms || !Array.isArray(mutingForms) || !mutingForms.length) {
      console.warn(
        `Configuration error. Config must define have a '${this.CONFIG_NAME}.${this.MUTE_PROPERTY}' array defined.`
      );
      return false;
    }
    return true;
  }

  private isMuteForm(form) {
    return this.getMutingForms().includes(form);
  }

  private isUnmuteForm(form) {
    return this.getUnmutingForms().includes(form);
  }

  /**
   * Returns whether a document is a muting or unmuting report that should be processed.
   * We only process new reports. The muting transition should not run when existing reports are edited.
   * @param {Object} doc
   * @returns {Boolean}
   * @private
   */
  private isRelevantReport(doc) {
    // exclude docs that are not reports and existent reports.
    if (!doc || doc._rev || doc.type !== 'data_record' || !doc.form) {
      return false;
    }

    if (this.isMuteForm(doc.form) || this.isUnmuteForm(doc.form)) {
      return true;
    }

    return false;
  }

  /**
   * Returns whether a document is a new contact.
   * The muting transition should not run on when existing contacts are edited.
   * @param {Object} doc
   * @returns {Boolean}
   * @private
   */
  private isRelevantContact(doc) {
    return !doc._rev && this.contactTypesService.includes(doc);
  }

  /**
   * Returns whether any of the docs from the batch should be processed
   * @param docs
   * @return {Boolean}
   */
  filter(docs) {
    return !!docs.filter(doc => this.isRelevantReport(doc) || this.isRelevantContact(doc)).length;
  }

  private async hydrateDocs(context) {
    const docs = [
      ...context.reports,
      ...context.contacts,
    ];
    const hydratedDocs = await this.lineageModelGeneratorService.docs(docs);

    for (const doc of hydratedDocs) {
      context.hydratedDocs[doc._id] = doc;
      let parent = doc.parent;
      while (parent) {
        context.hydratedDocs[parent._id] = parent;
        parent = parent.parent;
      }
    }
  }

  private async filterInvalidReports(context) {
    for (const [idx, report] of context.reports.entries()) {
      const hydratedReport = context.hydratedDocs[report._id];
      const valid = await this.isValid(report, hydratedReport);
      if (!valid) {
        context.reports.splice(idx, 1);
        delete context.hydratedDocs[report._id];
      }
    }
  }

  private async isValid(report, hydratedReport) {
    const context = {
      patient: hydratedReport.patient,
      place: hydratedReport.place,
    };

    const errors = await this.validationService.validate(hydratedReport, this.transitionConfig, context);
    if (errors && errors.length) {
      report.errors = errors;
    }

    return !errors || !errors.length;
  }

  private getSubject(report) {
    return report.patient || report.place;
  }

  private async processReports(context) {
    for (const report of context.reports) {
      const hydratedReport = context.hydratedDocs[report._id];
      await this.processReport(report, hydratedReport, context);
    }
  }

  private processReport(report, hydratedReport, context) {
    const mutedState = this.isMuteForm(report.form);
    const subject = this.getSubject(hydratedReport);
    if (!subject || !!this.contactMutedService.getMuted(subject) === mutedState) {
      // no subject or already in the correct state
      return Promise.resolve();
    }

    report.offline_transitions = report.offline_transitions || {};
    report.offline_transitions.muting = true;

    return this.updatedMuteState(subject, mutedState, report, context);
  }

  private async updatedMuteState(contact, muted, report, context) {
    // when muting, mute the contact itself + all descendents
    let rootContactId = contact._id;
    // when unmuting, find the topmost muted ancestor and unmute it and all its descendents
    if (!muted) {
      let parent = contact;
      while (parent) {
        rootContactId = parent.muted ? parent._id : rootContactId;
        parent = parent.parent;
      }
    }

    const contactsToProcess = await this.getContactsToProcess(contact, rootContactId, context);
    contactsToProcess.forEach(contactToProcess => {
      const knownContact = context.docs.find(doc => doc._id === contactToProcess._id);
      if (knownContact) {
        contactToProcess = knownContact;
      } else {
        context.docs.push(contactToProcess);
      }

      this.processContact(contactToProcess, muted, report._id, context);
    });
  }

  private getRootContact(rootContactId, context) {
    const knownContact = context.docs.find(doc => doc._id === rootContactId);
    if (knownContact) {
      return Promise.resolve(knownContact);
    }

    return this.dbService.get().get(rootContactId);
  }

  private async getDescendents(rootContactId) {
    const results = await this.dbService
      .get()
      .query('medic-client/contacts_by_place', { key: [rootContactId], include_docs: true });

    return results.rows.map(row => row.doc);
  }

  private async getContactsToProcess(contact, rootContactId, context) {
    const descendents = await this.getDescendents(rootContactId);
    const rootContact = await this.getRootContact(rootContactId, context);

    descendents.push(rootContact);
    const isContactADescendent = descendents.find(descendent => descendent._id === contact._id);
    if (!isContactADescendent) {
      descendents.push(contact);
    }

    return descendents;
  }

  private getLastMutingEvent(contact) {
    return this.lastUpdatedOffline(contact) && contact.muting_history.offline?.slice(-1)[0] || {};
  }
  private lastUpdatedOffline(contact) {
    return contact.muting_history?.last_update === this.OFFLINE;
  }

  private processContacts(context) {
    if (!context.contacts.length) {
      return;
    }

    context.contacts.forEach(contact => {
      const hydratedContact = context.hydratedDocs[contact._id];
      // we compile a lineage array for the contact from the context's hydratedDocs (which are updated on every
      // contact process and are up to date)
      const lineage = this.buildLineageFromHydratedDocs(hydratedContact, context);
      // we use the lineage array param, which takes precedence over inlined lineage on the contact object
      const mutedParent = this.contactMutedService.getMutedParent(hydratedContact, lineage);
      if (mutedParent) {
        // store reportId if the parent was last muted offline
        // if the parent was last muted online, we don't have access to this information
        const reportId = this.lastUpdatedOffline(mutedParent) ?
          this.getLastMutingEvent(mutedParent).report_id :
          undefined;

        this.processContact(contact, true, reportId, context);
      }
    });
  }

  private buildLineageFromHydratedDocs(contact, context) {
    let parent = contact.parent;
    const lineage = [];
    while (parent && parent._id) {
      lineage.push(context.hydratedDocs[parent._id]);
      parent = parent.parent;
    }
    return lineage;
  }

  private isSameMutingEvent(eventA, eventB) {
    const keys = ['muted', 'date', 'report_id'];
    return keys.every(key => eventA[key] === eventB[key]);
  }

  private processContact(contact, muted, reportId, context) {
    if (!contact.muting_history) {
      // store "online" state when first processing this doc offline
      contact.muting_history = {
        online: {
          muted: !!contact.muted,
          date: contact.muted,
        },
        offline: [],
      };
    }

    if (muted) {
      contact.muted = context.mutedTimestamp;
    } else {
      delete contact.muted;
    }
    contact.muting_history.last_update = this.OFFLINE;

    const mutingEvent = {
      muted: muted,
      date: context.mutedTimestamp,
      report_id: reportId,
    };
    const lastMutingEvent = this.getLastMutingEvent(contact);
    if (this.isSameMutingEvent(mutingEvent, lastMutingEvent)) {
      // don't duplicate the muting events
      return;
    }

    contact.muting_history.offline.push(mutingEvent);
    // consolidate muted state in hydratedDocs
    if (context.hydratedDocs[contact._id]) {
      context.hydratedDocs[contact._id].muted = contact.muted;
      context.hydratedDocs[contact._id].muting_history = contact.muting_history;
    }
  }

  async run(docs) {
    const context = {
      docs,
      reports: [],
      contacts: [],
      hydratedDocs: {},
      mutedTimestamp: new Date().toISOString(),
    };

    let hasMutingReport;
    let hasUnmutingReport;

    for (const doc of docs) {
      if (this.isRelevantContact(doc)) {
        context.contacts.push(doc);
        continue;
      }

      if (this.isRelevantReport(doc)) {
        if (this.isMuteForm(doc.form)) {
          hasMutingReport = true;
        } else {
          hasUnmutingReport = true;
        }
        context.reports.push(doc);
      }
    }

    if (hasMutingReport && hasUnmutingReport) {
      // we have reports that mute and unmute in the same batch, so only unmute!
      context.reports = context.reports.filter(report => this.isUnmuteForm(report.form));
    }

    await this.hydrateDocs(context);
    await this.filterInvalidReports(context);
    await this.processReports(context);
    this.processContacts(context);

    return docs;
  }
}

