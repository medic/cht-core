import { Injectable, NgZone } from '@angular/core';
import {
  groupBy as _groupBy,
  partial as _partial,
  find as _find,
  flattenDeep as _flattenDeep,
  map as _map
} from 'lodash-es';

import registrationUtils from '@medic/registration-utils';

import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { DbService } from '@mm-services/db.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SearchService } from '@mm-services/search.service';
import { ContactMutedService } from '@mm-services/contact-muted.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { TranslateService } from '@mm-services/translate.service';

/**
 * Hydrates the given contact by uuid and creates a model which
 * holds the doc and associated information for rendering. eg:
 * {
 *   _id: <doc uuid>,
 *   doc: <doc>,
 *   type: <object of the configuration of this contant type>,
 *   lineage: <array of contact's parents>,
 *   children: <array of contact's children>,
 *   reports: <array of reports about the contact>,
 *   isPrimaryContact: <boolean, true if contact is a primary for another contact>
 *   icon: <the ID of the icon resource that represents this contact's type>,
 *   label: <the translation key that describes this contact's type>
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class ContactViewModelGeneratorService {
  constructor(
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private dbService:DbService,
    private contactTypesService:ContactTypesService,
    private translateService:TranslateService,
    private searchService:SearchService,
    private contactMutedService:ContactMutedService,
    private getDataRecordsService:GetDataRecordsService,
    private ngZone:NgZone,
  ){}

  private primaryContactComparator (lhs, rhs) {
    if (lhs.isPrimaryContact) {
      return -1;
    }
    if (rhs.isPrimaryContact) {
      return 1;
    }
    return 0;
  }

  private typeComparator(lhs, rhs) {
    const lhsPerson = lhs.type?.person;
    const rhsPerson = rhs.type?.person;
    if (lhsPerson && !rhsPerson) {
      return -1;
    }
    if (!lhsPerson && rhsPerson) {
      return 1;
    }
    const lhsId = lhs.type && lhs.type.id || '';
    const rhsId = rhs.type && rhs.type.id || '';
    return lhsId.localeCompare(rhsId);
  }

  private nameComparator(lhs, rhs) {
    const primary = this.primaryContactComparator(lhs, rhs);
    if (primary !== 0) {
      return primary;
    }
    if (!lhs.doc.name && !rhs.doc.name) {
      return 0;
    }
    if (!rhs.doc.name) {
      return 1;
    }
    if (!lhs.doc.name) {
      return -1;
    }
    return lhs.doc.name.localeCompare(rhs.doc.name);
  }

  private ageComparator(lhs, rhs) {
    const primary = this.primaryContactComparator(lhs, rhs);
    if (primary !== 0) {
      return primary;
    }
    if (lhs.doc.date_of_birth &&
        rhs.doc.date_of_birth &&
        lhs.doc.date_of_birth !== rhs.doc.date_of_birth) {
      return lhs.doc.date_of_birth < rhs.doc.date_of_birth ? -1 : 1;
    }
    if (lhs.doc.date_of_birth && !rhs.doc.date_of_birth) {
      return 1;
    }
    if (!lhs.doc.date_of_birth && rhs.doc.date_of_birth) {
      return -1;
    }
    return this.nameComparator(lhs, rhs);
  }

  private reportedDateComparator(lhs, rhs) {
    if (lhs.reported_date > rhs.reported_date) {
      return -1;
    }
    if (lhs.reported_date < rhs.reported_date) {
      return 1;
    }
    return 0;
  }

  private mutedComparator(nextComparator, lhs, rhs) {
    if (!!lhs.doc.muted === !!rhs.doc.muted) {
      return nextComparator(lhs, rhs);
    }
    return lhs.doc.muted ? 1 : -1;
  }

  private setPrimaryContact(model) {
    const immediateParent = model.lineage && model.lineage.length && model.lineage[0];
    model.isPrimaryContact = immediateParent?.contact?._id === model.doc._id;
  }

  private setMutedState(modelToMute) {
    modelToMute.doc.muted = this.contactMutedService.getMuted(modelToMute.doc, modelToMute.lineage);
  }

  // muted state is inherited, but only set when online via Sentinel transition
  private setChildrenMutedState(model, children) {
    if (model.doc.muted) {
      children.forEach(child => child.doc.muted = child.doc.muted || model.doc.muted);
    }
    return children;
  }

  private groupChildrenByType(children) {
    return _groupBy(children, child => this.contactTypesService.getTypeId(child.doc));
  }

  private addPrimaryContact(doc, children) {
    const contactId = doc && doc.contact && doc.contact._id;
    if (!contactId) {
      return children;
    }

    const primaryContact = children.find(child => child.doc._id === contactId);
    if (primaryContact) {
      primaryContact.isPrimaryContact = true;
      return children;
    }

    // If the primary contact is not a child, fetch the document
    return this.dbService
      .get()
      .get(contactId)
      .then(doc => {
        children.push({
          doc: doc,
          isPrimaryContact: true,
          id: doc._id,
        });
        return children;
      })
      .catch((err) => {
        if (err.status === 404 || err.error === 'not_found') {
          return children;
        }
        throw err;
      });
  }

  private sortChildren(childModels) {
    childModels.forEach(group => {
      const comparator = group.type && group.type.sort_by_dob ? this.ageComparator : this.nameComparator;
      group.contacts.sort(_partial(this.mutedComparator, comparator.bind(this)));
    });
    childModels.sort(this.typeComparator);
    return childModels;
  }

  private getPersonChildTypes(types, parentId) {
    if (!parentId) {
      return [];
    }
    const childTypes = types.filter(type => {
      return type.person && type.parents && type.parents.includes(parentId);
    });
    return childTypes;
  }

  private getChildren (model, types, { getChildPlaces }: any = {}) {
    const options: any = { include_docs: true };
    const contactId = model.doc._id;
    if (getChildPlaces) {
      // get all types
      options.startkey = [ contactId ];
      options.endkey = [ contactId, {} ];
    } else {
      // just get person children
      const childTypes = this.getPersonChildTypes(types, model.type?.id);
      if (!childTypes.length) {
        return Promise.resolve([]);
      }
      options.keys = childTypes.map(type => [ contactId, type.id ]);
    }
    return this.dbService
      .get()
      .query('medic-client/contacts_by_parent', options)
      .then(response => response.rows);
  }

  private buildChildModels(groups, types) {
    return Object
      .keys(groups)
      .map(typeId => {
        return {
          contacts: groups[typeId],
          type: this.contactTypesService.getTypeById(types, typeId),
          deceasedCount: 0
        };
      });
  }

  private markDeceased(childModels) {
    childModels.forEach(group => {
      group.contacts.forEach(child => {
        if (child.doc.date_of_death) {
          group.deceasedCount++;
          child.deceased = true;
        }
      });
    });
    return childModels;
  }

  loadChildren(model, options?) {
    return this.ngZone.runOutsideAngular(() => this._loadChildren(model, options));
  }

  private _loadChildren(model, options?) {
    const newModel = { ...model, children: [] };
    return this.contactTypesService
      .getAll()
      .then(types => {
        return this
          .getChildren(newModel, types, options)
          .then(children => this.setChildrenMutedState(model, children))
          .then(children => this.addPrimaryContact(model.doc, children))
          .then(children => this.groupChildrenByType(children))
          .then(groups => this.buildChildModels(groups, types))
          .then(childModels => this.markDeceased(childModels))
          .then(childModels => this.sortChildren(childModels));
      });
  }

  private addPatientName(reports, contacts) {
    reports.forEach((report) => {
      if (report.fields && !report.fields.patient_name) {
        const patientId = report.fields.patient_id || report.patient_id;
        const patient = contacts.find(contact => contact.patient_id === patientId);
        if (patient) {
          report.fields.patient_name = patient.name;
        }
      }
    });
  }

  private getHeading(report, forms) {
    const form = _find(forms, { code: report.form });
    if (form && form.subjectKey) {
      return this.translateService.instant(form.subjectKey, report);
    }
    if (report.validSubject && report.subject && report.subject.value) {
      return report.subject.value;
    }
    if (report.subject && report.subject.name) {
      return report.subject.name;
    }
    return this.translateService.instant('report.subject.unknown');
  }

  private addHeading(reports, forms) {
    const reportIds = _map(reports, '_id');
    return this.getDataRecordsService
      .get(reportIds)
      .then((dataRecords) => {
        dataRecords.forEach((dataRecord) => {
          const report = reports.find(report => report._id === dataRecord._id);
          if (report) {
            report.heading = this.getHeading(dataRecord, forms);
          }
        });
        return reports;
      });
  }

  private getReports(contactDocs) {
    const subjectIds: any[] = [];
    contactDocs.forEach((doc) => {
      subjectIds.push(registrationUtils.getSubjectIds(doc));
    });
    const searchOptions = { subjectIds: _flattenDeep(subjectIds) };
    return this.searchService
      .search('reports', searchOptions, { include_docs: true })
      .then((reports) => {
        reports.forEach((report) => {
          report.valid = !report.errors || !report.errors.length;
        });
        return reports;
      });
  }

  loadReports(model, forms) {
    return this.ngZone.runOutsideAngular(() => this._loadReports(model, forms));
  }

  private _loadReports(model, forms) {
    const contacts = [ model.doc ];
    model.children.forEach(group => {
      if (group.type && group.type.person) {
        group.contacts.forEach(contact => contacts.push(contact.doc));
      }
    });
    return this
      .getReports(contacts)
      .then(reports => this.addHeading(reports, forms))
      .then((reports) => {
        this.addPatientName(reports, contacts);
        reports.sort(this.reportedDateComparator);
        return reports;
      });
  }

  private setType(model, types) {
    const typeId = this.contactTypesService.getTypeId(model.doc);
    model.type = this.contactTypesService.getTypeById(types, typeId);
  }

  getContact(id, options?) {
    return this.ngZone.runOutsideAngular(() => this._getContact(id, options));
  }

  private _getContact(id, options?) {
    return Promise
      .all([
        this.contactTypesService.getAll(),
        this.lineageModelGeneratorService.contact(id, options)
      ])
      .then(([types, model]) => {
        this.setType(model, types);
        this.setPrimaryContact(model);
        this.setMutedState(model);

        return model;
      });
  }
}
