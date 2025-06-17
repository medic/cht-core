/**
 * Service to identify relevant changes in relation to a Contact document.
 */
import { Injectable } from '@angular/core';

import { ContactTypesService } from '@mm-services/contact-types.service';
import * as registrationUtils from '@medic/registration-utils';

@Injectable({
  providedIn: 'root'
})
export class ContactChangeFilterService {
  constructor(
    private contactTypesService: ContactTypesService
  ){}

  private isValidInput(object) {
    return !!(object && object.doc);
  }

  private isReport(change) {
    return !!change.doc.form && change.doc.type === 'data_record';
  }

  private matchReportSubject(report, contact) {
    const reportSubjects = registrationUtils.getSubjectIds(report.doc);
    const contactSubjects = registrationUtils.getSubjectIds(contact.doc);

    return contactSubjects.some(subject => reportSubjects.includes(subject));
  }

  private isChild(change, contact) {
    return !!change.doc.parent && change.doc.parent._id === contact.doc._id;
  }

  private wasChild(change, contact) {
    return contact.children?.some(
      (childType:{ contacts:[] }) => childType.contacts.some(
        (child:{ doc:{_id: string}}) => child.doc._id === change.doc._id
      )
    );
  }

  private isAncestor(change, contact) {
    return contact.lineage?.some(ancestor => ancestor?._id === change.doc._id);
  }

  private matchChildReportSubject(change, contact) {
    return contact.children?.some(
      (childType:{ contacts:[] }) => childType?.contacts?.some(
        contact => this.matchReportSubject(change, contact)
      )
    );
  }

  matchContact(change, contact) {
    return this.isValidInput(contact) && contact.doc._id === change.id;
  }

  isRelevantReport(change, contact) {
    return this.isValidInput(change) &&
           this.isValidInput(contact) &&
           this.isReport(change) &&
           (this.matchReportSubject(change, contact) || this.matchChildReportSubject(change, contact));
  }

  isRelevantContact(change, contact) {
    return this.isValidInput(change) &&
           this.isValidInput(contact) &&
           this.contactTypesService.includes(change.doc) &&
           (
             this.isAncestor(change, contact) ||
             this.isChild(change, contact) ||
             this.wasChild(change, contact)
           );
  }

  isDeleted(change) {
    return !!change && !!change.deleted;
  }

  isRelevantChange(change, contact) {
    return this.matchContact(change, contact) ??
      this.isRelevantContact(change, contact) ??
      this.isRelevantReport(change, contact);
  }
}
