import { Injectable } from '@angular/core';
import * as _ from 'lodash-es';
import { TranslateService } from '@ngx-translate/core';

import { LineageModelGeneratorService } from './lineage-model-generator.service';
import { DbService } from './db.service';
import { ContactTypesService } from './contact-types.service';
import { SearchService } from './search.service';
import { ContactMutedService } from './contact-muted.service';
import { GetDataRecordsService } from './get-data-records.service';

const registrationUtils = require('@medic/registration-utils');

const PRIMARY_CONTACT_COMPARATOR = (lhs, rhs) => {
  if (lhs.isPrimaryContact) {
    return -1;
  }
  if (rhs.isPrimaryContact) {
    return 1;
  }
  return 0;
};

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
    private lineageModelGeneratorService: LineageModelGeneratorService,
    private dbService: DbService,
    private contactTypesService: ContactTypesService,
    private translateService: TranslateService,
    private searchService: SearchService,
    private contactMutedService: ContactMutedService,
    private getDataRecordsService: GetDataRecordsService,
  ){}

  private TYPE_COMPARATOR (lhs, rhs) {
    const lhsPerson = lhs.type && lhs.type.person;
    const rhsPerson = rhs.type && rhs.type.person;
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

  private NAME_COMPARATOR = (lhs, rhs) => {
    const primary = PRIMARY_CONTACT_COMPARATOR(lhs, rhs);
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
  };

  private AGE_COMPARATOR(lhs, rhs) {
    const primary = PRIMARY_CONTACT_COMPARATOR(lhs, rhs);
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
    return this.NAME_COMPARATOR(lhs, rhs);
  }

  private REPORTED_DATE_COMPARATOR(lhs, rhs) {
    if (lhs.reported_date > rhs.reported_date) {
      return -1;
    }
    if (lhs.reported_date < rhs.reported_date) {
      return 1;
    }
    return 0;
  }

  private MUTED_COMPARATOR(nextComparator, lhs, rhs) {
    if (!!lhs.doc.muted === !!rhs.doc.muted) {
      return nextComparator(lhs, rhs);
    }
    return lhs.doc.muted ? 1 : -1;
  }

  private setPrimaryContact(model) {
    const immediateParent = model.lineage && model.lineage.length && model.lineage[0];
    model.isPrimaryContact = immediateParent &&
      immediateParent.contact &&
      immediateParent.contact._id === model.doc._id;
  }

  private setMutedState = modelToMute => {
    modelToMute.doc.muted = this.contactMutedService.getMuted(modelToMute.doc, modelToMute.lineage);
  };

  // muted state is inherited, but only set when online via Sentinel transition
  private setChildrenMutedState(model, children) {
    if (model.doc.muted) {
      children.forEach(child => child.doc.muted = child.doc.muted || model.doc.muted);
    }
    return children;
  }

  private groupChildrenByType = children => {
    return _.groupBy(children, child => child.doc.contact_type || child.doc.type);
  };

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
    return this.dbService.get(contactId)
      .then(doc => {
        children.push({
          doc: doc,
          isPrimaryContact: true
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
      const comparator = group.type && group.type.sort_by_dob ? this.AGE_COMPARATOR : this.NAME_COMPARATOR;
      group.contacts.sort(_.partial(this.MUTED_COMPARATOR, comparator));
    });
    childModels.sort(this.TYPE_COMPARATOR);
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
      const childTypes = this.getPersonChildTypes(types, model.type && model.type.id);
      if (!childTypes.length) {
        return Promise.resolve([]);
      }
      options.keys = childTypes.map(type => [ contactId, type.id ]);
    }
    return this.dbService.get().query('medic-client/contacts_by_parent', options)
      .then(response => response.rows);
  }

  private buildChildModels(groups, types) {
    return Object.keys(groups).map(typeId => {
      return {
        contacts: groups[typeId],
        type: types.find(type => type.id === typeId),
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
    const newModel = Object.assign({children: []}, model);
    return this.contactTypesService.getAll().then(types => {
      return this.getChildren(newModel, types, options)
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
    const form = _.find(forms, { code: report.form });
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
    const reportIds = _.map(reports, '_id');
    return this.getDataRecordsService.get(reportIds).then((dataRecords) => {
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
    const subjectIds = [];
    contactDocs.forEach((doc) => {
      subjectIds.push(registrationUtils.getSubjectIds(doc));
    });
    const searchOptions = { subjectIds: _.flattenDeep(subjectIds) };
    return this.searchService.search('reports', searchOptions, { include_docs: true }).then((reports) => {
      reports.forEach((report) => {
        report.valid = !report.errors || !report.errors.length;
      });
      return reports;
    });
  }

  loadReports(model, forms) {
    const contacts = [ model.doc ];
    model.children.forEach(group => {
      if (group.type && group.type.person) {
        group.contacts.forEach(contact => contacts.push(contact.doc));
      }
    });
    return this.getReports(contacts)
      .then(reports => this.addHeading(reports, forms))
      .then((reports) => {
        this.addPatientName(reports, contacts);
        reports.sort(this.REPORTED_DATE_COMPARATOR);
        return reports;
      });
  }

  private setType(model, types) {
    const typeId = model.doc.contact_type || model.doc.type;
    model.type = types.find(type => type.id === typeId);
  }

  getContact(id, options?) {
    return Promise
      .all([
        this.contactTypesService.getAll(),
        this.lineageModelGeneratorService.contact(id, options)
      ])
      .then((results) => {
        const types = results[0];
        const model = results[1];

        this.setType(model, types);
        this.setPrimaryContact(model);
        this.setMutedState(model);

        return model;
      });
  }
}
