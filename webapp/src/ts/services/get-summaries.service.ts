import { Injectable } from '@angular/core';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class GetSummariesService {
  constructor(
    private contactTypesService:ContactTypesService,
    private dbService:DbService,
    private sessionService:SessionService,
  ) {
  }

  private readonly SUBJECT_FIELDS = [ 'patient_id', 'patient_uuid', 'patient_name', 'place_id' ];

  private getLineage(contact) {
    const parts: any[] = [];
    while (contact) {
      if (contact._id) {
        parts.push(contact._id);
      }
      contact = contact.parent;
    }
    return parts;
  }

  private isMissingSubjectError(error) {
    return error.code === 'sys.missing_fields' &&
      error.fields &&
      error.fields.some(field => this.SUBJECT_FIELDS.includes(field));
  }

  private getSubject(doc) {
    const subject:any = {};
    const reference =
      doc.patient_id ||
      (doc.fields && doc.fields.patient_id) ||
      (doc.fields && doc.fields.patient_uuid) ||
      doc.place_id ||
      (doc.fields && doc.fields.place_id);
    const patientName = doc.fields && doc.fields.patient_name;
    if (patientName) {
      subject.name = patientName;
    }

    if (reference) {
      subject.value = reference;
      subject.type = 'reference';
    } else if (patientName) {
      subject.value = patientName;
      subject.type = 'name';
    } else if (doc.errors) {
      if (doc.errors.some(error => this.isMissingSubjectError(error))) {
        subject.type = 'unknown';
      }
    }

    return subject;
  }

  private summarise(doc) {
    if (!doc) {
      // happens when the doc with the requested id wasn't found in the DB
      return;
    }

    if (doc.type === 'data_record' && doc.form) { // report
      return {
        _id: doc._id,
        _rev: doc._rev,
        from: doc.from || doc.sent_by,
        phone: doc.contact && doc.contact.phone,
        form: doc.form,
        read: doc.read,
        valid: !doc.errors || !doc.errors.length,
        verified: doc.verified,
        reported_date: doc.reported_date,
        contact: doc.contact && doc.contact._id,
        lineage: this.getLineage(doc.contact && doc.contact.parent),
        subject: this.getSubject(doc),
        case_id: doc.case_id || (doc.fields && doc.fields.case_id)
      };
    }
    if (this.contactTypesService.includes(doc)) { // contact
      return {
        _id: doc._id,
        _rev: doc._rev,
        name: doc.name || doc.phone,
        phone: doc.phone,
        type: doc.type,
        contact_type: doc.contact_type,
        contact: doc.contact && doc.contact._id,
        lineage: this.getLineage(doc.parent),
        date_of_death: doc.date_of_death,
        muted: doc.muted
      };
    }
  }

  async get(ids?) {
    if (!ids?.length) {
      return Promise.resolve([]);
    }

r   const result = await this.dbService
      .get()
      .allDocs({ keys: ids, include_docs: true });

    return result?.rows
      ?.map(row => this.summarise(row.doc))
      .filter(summary => summary);
  }

  getByDocs(docs) {
    if (!docs?.length) {
      return [];
    }

    return docs
      .map(doc => this.summarise(doc))
      .filter(summary => summary);
  }
}
