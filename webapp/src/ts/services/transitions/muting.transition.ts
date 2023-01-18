import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { ContactMutedService } from '@mm-services/contact-muted.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { Transition, Doc } from '@mm-services/transitions/transition';
import { ValidationService } from '@mm-services/validation.service';

@Injectable({
  providedIn: 'root'
})
export class MutingTransition extends Transition {
  constructor(
    private dbService:DbService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private contactMutedService:ContactMutedService,
    private contactTypesService:ContactTypesService,
    private validationService:ValidationService,
  ) {
    super();
  }

  readonly name = 'muting';

  private transitionConfig;
  private inited;
  private readonly CONFIG_NAME = this.name;
  private readonly MUTE_PROPERTY = 'mute_forms';
  private readonly UNMUTE_PROPERTY = 'unmute_forms';
  private readonly CLIENT = 'client_side';
  private readonly SERVER = 'server_side';

  private getConfig(settings = {}) {
    return settings[this.CONFIG_NAME] || {};
  }

  private getMutingForms() {
    return this.transitionConfig?.[this.MUTE_PROPERTY] || [];
  }

  getUnmutingForms(settings?) {
    const config = settings ? this.getConfig(settings) : this.transitionConfig;
    return config?.[this.UNMUTE_PROPERTY] || [];
  }

  init(settings) {
    this.transitionConfig = this.getConfig(settings);

    const mutingForms = this.getMutingForms();
    if (!mutingForms || !Array.isArray(mutingForms) || !mutingForms.length) {
      console.warn(
        `Configuration error. Config must define have a '${this.CONFIG_NAME}.${this.MUTE_PROPERTY}' array defined.`
      );
      this.inited = false;
    } else {
      this.inited = true;
    }

    return this.inited;
  }

  private isMuteForm(form) {
    return !!form && this.getMutingForms().includes(form);
  }

  isUnmuteForm(form, settings?) {
    return !!form && this.getUnmutingForms(settings).includes(form);
  }

  /**
   * Returns whether a document is a muting or unmuting report that should be processed.
   * We only process new reports. The muting transition should not run when reports are edited.
   * @param {Doc} doc - the doc to check
   * @returns {Boolean} - whether this is a new muting or unmuting report
   * @private
   */
  private isRelevantReport(doc) {
    // exclude docs that are not reports and existent reports.
    if (doc._rev || doc.type !== 'data_record' || !doc.form) {
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
   * @param {Object} doc - doc to check
   * @returns {Boolean} - whether the doc is a new contact type document
   * @private
   */
  private isRelevantContact(doc) {
    return !doc._rev && this.contactTypesService.includes(doc);
  }

  /**
   * @param {Array<Doc>} docs - docs to be saved
   * @return {Boolean} - whether any of the docs from the batch should be processed
   */
  filter(docs) {
    return !!docs.filter(doc => doc && (this.isRelevantReport(doc) || this.isRelevantContact(doc))).length;
  }

  private async hydrateDocs(context:MutingContext) {
    const docs = [
      ...context.reports,
      ...context.contacts,
    ];
    const hydratedDocs = await this.lineageModelGeneratorService.docs(docs);

    for (const doc of hydratedDocs) {
      this.cacheHydratedDoc(doc, context);
      this.cacheHydratedDoc(doc.patient, context);
      this.cacheHydratedDoc(doc.place, context);
    }
  }

  private cacheHydratedDoc(doc, context) {
    if (!doc) {
      return;
    }

    context.hydratedDocs[doc._id] = doc;
    let parent = doc.parent;
    // store a reference of every hydrated parent contact. we will keep this main copy updated with the currently
    // correct muting state, instead of updating every copy from the ancestors inline lineage for every event.
    while (parent) {
      if (parent._id) {
        context.hydratedDocs[parent._id] = parent;
      }
      parent = parent.parent;
    }
  }

  /**
   * Iterates over muting reports, and validates each one. If a report has validation errors,
   * they will be stored on the copy to be saved and the report will not be processed further.
   * @param {MutingContext} context - current muting context
   * @private
   */
  private async filterInvalidReports(context:MutingContext) {
    for (const [idx, report] of context.reports.entries()) {
      const hydratedReport = context.hydratedDocs[report._id];
      const errors = await this.validate(report, hydratedReport);
      if (errors?.length) {
        report.errors = errors;
        context.reports.splice(idx, 1);
        delete context.hydratedDocs[report._id];
      }
    }
  }

  /**
   * Provides correct message context for validation and returns validation results.
   * @param {Doc} report - the original report doc
   * @param {Doc} hydratedReport - the hydrated version of report
   * @returns {Array[Object]}
   * @private
   */
  private validate(report, hydratedReport) {
    const errorMessageContext = {
      patient: hydratedReport.patient,
      place: hydratedReport.place,
    };

    return this.validationService.validate(hydratedReport, this.transitionConfig, errorMessageContext);
  }

  private async processReports(context) {
    for (const report of context.reports) {
      const hydratedReport = context.hydratedDocs[report._id];
      await this.processReport(report, hydratedReport, context);
    }
  }

  private processReport(report, hydratedReport, context) {
    const mutedState = this.isMuteForm(report.form);
    const subject = hydratedReport.patient || hydratedReport.place;
    if (!subject || !!this.contactMutedService.getMuted(subject) === mutedState) {
      // no subject or already in the correct state
      return Promise.resolve();
    }

    this.addTransitionLog(report);

    return this.updatedMuteState(subject, mutedState, report, context);
  }

  private getKnownDoc(docId, context) {
    return context.docs.find(doc => doc._id === docId);
  }

  /**
   * Gets the topmost contact to be updated and updates it and all its descendents to have a correct muting state.
   * Pushes newly read docs to the context docs list, to be returned to be saved after execution.
   * @param {Doc} contact - the target of the muting event
   * @param {Boolean} muted - true when muting, false when unmuting
   * @param {Doc} report - the muting/unmuting report
   * @param {MutingContext} context - current muting context
   * @private
   */
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
      const knownContact = this.getKnownDoc(contactToProcess._id, context);
      // if we've already loaded a contact, assume the copy we already have is the latest and up to date
      if (knownContact) {
        contactToProcess = knownContact;
      } else {
        context.docs.push(contactToProcess);
      }

      this.processContact(contactToProcess, muted, report._id, context);
    });
  }

  private getDoc(docId, context) {
    const knownDoc = this.getKnownDoc(docId, context);
    if (knownDoc) {
      // if we've already loaded a doc, assume the copy we already have is the latest and up to date
      return Promise.resolve(knownDoc);
    }

    return this.dbService.get().get(docId);
  }

  private async getDescendents(rootContactId) {
    const results = await this.dbService
      .get()
      .query('medic-client/contacts_by_place', { key: [rootContactId], include_docs: true });

    return results.rows.map(row => row.doc);
  }

  /**
   * @param {Doc} contact - the current contact being processed
   * @param {string} rootContactId - the topmost contact to be updated
   * @param {MutingContext} context - current context
   * @returns {Promise<Array[Doc]>} - a list of all contacts to be processed, including the current and root contacts
   * @private
   */
  private async getContactsToProcess(contact, rootContactId, context) {
    const contactsToProcess = await this.getDescendents(rootContactId);

    const rootContact = await this.getDoc(rootContactId, context);
    contactsToProcess.push(rootContact);

    const found = contactsToProcess.find(descendent => descendent._id === contact._id);
    if (!found) {
      contactsToProcess.push(contact);
    }

    return contactsToProcess;
  }

  private getLastMutingEvent(contact) {
    return this.lastUpdatedByClient(contact) &&
      contact.muting_history[this.CLIENT]?.slice(-1)[0] ||
      {};
  }

  private lastUpdatedByClient(contact) {
    return contact.muting_history?.last_update === this.CLIENT;
  }

  /**
   * Mutes every new contact that has a muted ancestor.
   * @param {MutingContext} context - current muting context
   * @private
   */
  private processContacts(context) {
    if (!context.contacts.length) {
      return;
    }

    context.contacts.forEach(contact => {
      const hydratedContact = context.hydratedDocs[contact._id];
      // compile a lineage array using the current context's hydratedDocs (these are updated when we
      // process contacts and should up to date)
      const lineage = this.buildLineageFromContext(hydratedContact, context);
      // use the lineage param, which takes precedence over inlined object lineage
      const mutedParent = this.contactMutedService.getMutedDoc(hydratedContact, lineage);
      if (mutedParent) {
        // store reportId if the parent was last muted client-side
        // if the parent was last muted server-side, we don't have access to this information
        const reportId = this.lastUpdatedByClient(mutedParent) ?
          this.getLastMutingEvent(mutedParent).report_id :
          undefined;

        this.processContact(contact, true, reportId, context);
      }
    });
  }

  private buildLineageFromContext(contact, context) {
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

  /**
   * Updates a contact to set muted state and update muting history.
   * Doesn't duplicate muting histories
   * Consolidates muted state in context hydratedDocs
   * @param {Doc} contact - contact doc to be updated
   * @param {Boolean} muted - true when muting, false when unmuting
   * @param {string} reportId - the muting report
   * @param {MutingContext} context - current muting context
   * @private
   */
  private processContact(contact, muted, reportId, context) {
    if (!contact.muting_history) {
      // store "server" state when first processing this doc client_side
      contact.muting_history = {
        [this.SERVER]: {
          muted: !!contact.muted,
          date: contact.muted,
        },
        [this.CLIENT]: [],
      };
    }

    if (muted) {
      contact.muted = context.mutedTimestamp;
    } else {
      delete contact.muted;
    }
    contact.muting_history.last_update = this.CLIENT;

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

    contact.muting_history[this.CLIENT].push(mutingEvent);
    // consolidate muted state in hydratedDocs
    if (context.hydratedDocs[contact._id]) {
      context.hydratedDocs[contact._id].muted = contact.muted;
      context.hydratedDocs[contact._id].muting_history = contact.muting_history;
    }
  }

  /**
   * @param {Array<Doc>} docs - docs to run the transition over
   * @returns {Promise<Array<Doc>>} - updated docs (may include additional docs)
   */
  async run(docs) {
    if (!this.inited) {
      return Promise.resolve(docs);
    }

    const context:MutingContext = {
      docs,
      reports: [],
      contacts: [],
      hydratedDocs: {},
      mutedTimestamp: new Date().toISOString(),
    };

    let hasMutingReport;
    let hasUnmutingReport;

    for (const doc of docs) {
      if (!doc) {
        continue;
      }

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


interface MutingContext {
  docs:Array<Doc>;
  reports:Array<Doc>;
  contacts:Array<Doc>;
  hydratedDocs:HydratedDocs;
  mutedTimestamp:string;
}

interface HydratedDocs {
  [uuid:string]:Doc;
}
