import { v4 as uuidV4 } from 'uuid';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { reduce as _reduce, isObject as _isObject } from 'lodash-es';

import { DbService } from '@mm-services/db.service';
import { EnketoTranslationService } from '@mm-services/enketo-translation.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactTypesService } from '@mm-services/contact-types.service';

@Injectable({
  providedIn: 'root'
})
export class ContactSaveService {
  private servicesActions;
  private readonly CONTACT_FIELD_NAMES = [ 'parent', 'contact' ];

  constructor(
    private store:Store,
    private contactTypesService:ContactTypesService,
    private dbService:DbService,
    private enketoTranslationService:EnketoTranslationService,
    private extractLineageService:ExtractLineageService,
  ) {
    this.servicesActions = new ServicesActions(store);
  }

  private generateFailureMessage(bulkDocsResult) {
    return _reduce(bulkDocsResult, (msg, result) => {
      let newMsg = msg;
      if (!result.ok) {
        if (!newMsg) {
          newMsg = 'Some documents did not save correctly: ';
        }
        newMsg += result.id + ' with ' + result.message + '; ';
      }
      return newMsg;
    }, null);
  }

  private prepareSubmittedDocsForSave(original, submitted) {
    const doc = this.prepare(submitted.doc);

    return this
      .prepareAndAttachSiblingDocs(submitted.doc, original, submitted.siblings)
      .then((siblings) => {
        const extract = item => {
          item.parent = item.parent && this.extractLineageService.extract(item.parent);
          item.contact = item.contact && this.extractLineageService.extract(item.contact);
        };

        siblings.forEach(extract);
        extract(doc);

        // This must be done after prepareAndAttachSiblingDocs, as it relies
        // on the doc's parents being attached.
        const repeated = this.prepareRepeatedDocs(submitted.doc, submitted.repeats);

        return {
          docId: doc._id,
          preparedDocs: [ doc ].concat(repeated, siblings) // NB: order matters: #4200
        };
      });
  }

  // Prepares document to be bulk-saved at a later time, and for it to be
  // referenced by _id by other docs if required.
  private prepare(doc) {
    if (!doc._id) {
      doc._id = uuidV4();
    }

    if (!doc._rev) {
      doc.reported_date = Date.now();
    }

    return doc;
  }

  private prepareRepeatedDocs(doc, repeated) {
    const childData = (repeated && repeated.child_data) || [];
    return childData.map(child => {
      child.parent = this.extractLineageService.extract(doc);
      return this.prepare(child);
    });
  }

  private extractIfRequired(name, value) {
    return this.CONTACT_FIELD_NAMES.includes(name) ? this.extractLineageService.extract(value) : value;
  }

  // Mutates the passed doc to attach prepared siblings, and returns all
  // prepared siblings to be persisted.
  // This will (on a correctly configured form) attach the full parent to
  // doc, and in turn siblings. See internal comments.
  private prepareAndAttachSiblingDocs(doc, original, siblings) {
    if (!doc._id) {
      throw new Error('doc passed must already be prepared with an _id');
    }

    const preparedSiblings = [];
    let promiseChain = Promise.resolve();

    this.CONTACT_FIELD_NAMES.forEach(fieldName => {
      let value = doc[fieldName];
      if (_isObject(value)) {
        value = doc[fieldName]._id;
      }
      if (!value) {
        return;
      }
      if (value === 'NEW') {
        const preparedSibling = this.prepare(siblings[fieldName]);

        // by default all siblings are "person" types but can be overridden
        // by specifying the type and contact_type in the form
        if (!preparedSibling.type) {
          preparedSibling.type = 'person';
        }

        if (preparedSibling.parent === 'PARENT') {
          delete preparedSibling.parent;
          // Cloning to avoid the circular reference we would make:
          //   doc.fieldName.parent.fieldName.parent...
          doc[fieldName] = { ...preparedSibling };
          // Because we're assigning the actual doc referencem, the DB().get
          // to attach the full parent to the doc will also attach it here.
          preparedSibling.parent = doc;
        } else {
          doc[fieldName] = this.extractIfRequired(fieldName, preparedSibling);
        }

        preparedSiblings.push(preparedSibling);
      } else if (original &&
        original[fieldName] &&
        original[fieldName]._id === value) {
        doc[fieldName] = original[fieldName];
      } else {
        promiseChain = promiseChain.then(() => {
          return this.dbService
            .get()
            .get(value)
            .then((dbFieldValue) => {
              // In a correctly configured form one of these will be the
              // parent This must happen before we attempt to run
              // ExtractLineage on any siblings or repeats, otherwise they
              // will extract an incomplete lineage
              doc[fieldName] = this.extractIfRequired(fieldName, dbFieldValue);
            });
        });
      }
    });

    return promiseChain.then(() => preparedSiblings);
  }

  save(form, docId, type) {
    return Promise
      .resolve()
      .then(() => docId ? this.dbService.get().get(docId) : null)
      .then(original => {
        const submitted = this.enketoTranslationService.contactRecordToJs(form.getDataStr({ irrelevant: false }));
        if (original) {
          submitted.doc = $.extend({}, original, submitted.doc);
        } else if (this.contactTypesService.isHardcodedType(type)) {
          // default hierarchy - maintain backwards compatibility
          submitted.doc.type = type;
        } else {
          // configured hierarchy
          submitted.doc.type = 'contact';
          submitted.doc.contact_type = type;
        }
        return this.prepareSubmittedDocsForSave(original, submitted);
      })
      .then((preparedDocs) => {
        const primaryDoc = preparedDocs.preparedDocs.find(doc => doc.type === type);
        this.servicesActions.setLastChangedDoc(primaryDoc|| preparedDocs.preparedDocs[0]);

        return this.dbService
          .get()
          .bulkDocs(preparedDocs.preparedDocs)
          .then((bulkDocsResult) => {
            const failureMessage = this.generateFailureMessage(bulkDocsResult);

            if (failureMessage) {
              throw new Error(failureMessage);
            }

            return { docId: preparedDocs.docId, bulkDocsResult };
          });
      });
  }
}
