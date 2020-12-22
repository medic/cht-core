/**
 * Service to identify relevant changes in relation to a Contact document.
 */
import { Injectable } from '@angular/core';
import { some } from 'lodash-es';

import { ContactTypesService } from '@mm-services/contact-types.service';

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
    if (report.doc.fields && (
      (report.doc.fields.patient_id && report.doc.fields.patient_id === contact.doc._id) ||
      (report.doc.fields.patient_id && report.doc.fields.patient_id === contact.doc.patient_id) ||
      (report.doc.fields.place_id && report.doc.fields.place_id === contact.doc._id) ||
      (report.doc.fields.place_id && report.doc.fields.place_id === contact.doc.place_id))) {
      return true;
    }

    if ((report.doc.patient_id && report.doc.patient_id === contact.doc.patient_id) ||
        (report.doc.patient_id && report.doc.patient_id === contact.doc._id) ||
        (report.doc.place_id && report.doc.place_id === contact.doc.place_id) ||
        (report.doc.place_id && report.doc.place_id === contact.doc._id)) {
      return true;
    }

    return false;
  }

  private isChild(change, contact) {
    return !!change.doc.parent && change.doc.parent._id === contact.doc._id;
  }

  private wasChild(change, contact) {
    return some(contact.children, (children) => {
      return children instanceof Array && some(children, (child) => {
        return child.doc._id === change.doc._id;
      });
    });
  }

  private isAncestor(change, contact) {
    return some(contact.lineage, (lineage) => {
      return !!lineage && lineage._id === change.doc._id;
    });
  }

  private matchChildReportSubject(change, contact) {
    return some(contact.children, (children) => {
      return children instanceof Array && some(children, (child) => {
        return this.matchReportSubject(change, child);
      });
    });
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
           (this.isAncestor(change, contact) || this.isChild(change, contact) || this.wasChild(change, contact));
  }

  isDeleted(change) {
    return !!change && !!change.deleted;
  }
}
