/**
 * Service to identify relevant changes in relation to a Contact document.
 */
import { Injectable } from '@angular/core';
import * as _ from 'lodash-es';

import { ContactTypesService } from './contact-types.service';

const isValidInput = function(object) {
  return !!(object && object.doc);
};

const isReport = function(change) {
  return !!change.doc.form && change.doc.type === 'data_record';
};

const matchReportSubject = function(report, contact) {
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
};

const isChild = function(change, contact) {
  return !!change.doc.parent && change.doc.parent._id === contact.doc._id;
};

const wasChild = function(change, contact) {
  return _.some(contact.children, function(children) {
    return children instanceof Array && _.some(children, function(child) {
      return child.doc._id === change.doc._id;
    });
  });
};

const isAncestor = function(change, contact) {
  return _.some(contact.lineage, function(lineage) {
    return !!lineage && lineage._id === change.doc._id;
  });
};

const matchChildReportSubject = function(change, contact) {
  return _.some(contact.children, function(children) {
    return children instanceof Array && _.some(children, function(child) {
      return matchReportSubject(change, child);
    });
  });
};

@Injectable({
  providedIn: 'root'
})
export class ContactChangeFilterService {
  constructor(
    private contactTypesService: ContactTypesService
  ){}
  
  matchContact(change, contact) {
    return isValidInput(contact) && contact.doc._id === change.id;
  }

  isRelevantReport(change, contact) {
    return isValidInput(change) &&
           isValidInput(contact) &&
           isReport(change) &&
           (matchReportSubject(change, contact) || matchChildReportSubject(change, contact));
  }

  isRelevantContact(change, contact) {
    return isValidInput(change) &&
           isValidInput(contact) &&
           this.contactTypesService.includes(change.doc) &&
           (isAncestor(change, contact) || isChild(change, contact) || wasChild(change, contact));
  }

  isDeleted(change) {
    console.log('is deleted', change.deleted);
    return !!change && !!change.deleted;
  }
}
