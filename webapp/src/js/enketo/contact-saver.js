const EnketoDataTranslator = require('./enketo-data-translator');
const { defaults: _defaults, isObject: _isObject, reduce: _reduce } = require('lodash');
const { v4: uuidV4 } = require('uuid');

const CONTACT_FIELD_NAMES = ['parent', 'contact'];

// Prepares document to be bulk-saved at a later time, and for it to be
// referenced by _id by other docs if required.
const prepare = (doc) => {
  if(!doc._id) {
    doc._id = uuidV4();
  }

  if(!doc._rev) {
    doc.reported_date = Date.now();
  }

  return doc;
};

const extractIfRequired = (extractLineageService, name, value) => {
  return CONTACT_FIELD_NAMES.includes(name) ? extractLineageService.extract(value) : value;
};

const prepareNewSibling = (extractLineageService, doc, fieldName, siblings) => {
  const preparedSibling = prepare(siblings[fieldName]);

  // by default all siblings are "person" types but can be overridden
  // by specifying the type and contact_type in the form
  if(!preparedSibling.type) {
    preparedSibling.type = 'person';
  }

  if(preparedSibling.parent === 'PARENT') {
    delete preparedSibling.parent;
    // Cloning to avoid the circular references
    doc[fieldName] = Object.assign({}, preparedSibling);
    // Because we're assigning the actual doc reference, the dbService.get.get
    // to attach the full parent to the doc will also attach it here.
    preparedSibling.parent = doc;
  } else {
    doc[fieldName] = extractIfRequired(extractLineageService, fieldName, preparedSibling);
  }

  return preparedSibling;
};

const getContact = (dbService, extractLineageService, doc, fieldName, contactId) => {
  return dbService
    .get()
    .get(contactId)
    .then((dbFieldValue) => {
      // In a correctly configured form one of these will be the
      // parent. This must happen before we attempt to run
      // ExtractLineage on any siblings or repeats, otherwise they
      // will extract an incomplete lineage
      doc[fieldName] = extractIfRequired(extractLineageService, fieldName, dbFieldValue);
    });
};

// Mutates the passed doc to attach prepared siblings, and returns all
// prepared siblings to be persisted.
// This will (on a correctly configured form) attach the full parent to
// doc, and in turn siblings. See internal comments.
const prepareAndAttachSiblingDocs = (extractLineageService, dbService, doc, original, siblings) => {
  if(!doc._id) {
    throw new Error('doc passed must already be prepared with an _id');
  }

  const preparedSiblings = [];
  let promiseChain = Promise.resolve();

  CONTACT_FIELD_NAMES.forEach(fieldName => {
    let value = doc[fieldName];
    if(_isObject(value)) {
      value = doc[fieldName]._id;
    }
    if(!value) {
      return;
    }
    if(value === 'NEW') {
      const preparedSibling = prepareNewSibling(extractLineageService, doc, fieldName, siblings);
      preparedSiblings.push(preparedSibling);
    } else if(original && original[fieldName] && original[fieldName]._id === value) {
      doc[fieldName] = original[fieldName];
    } else {
      promiseChain = promiseChain
        .then(() => getContact(dbService, extractLineageService, doc, fieldName, value));
    }
  });

  return promiseChain.then(() => preparedSiblings);
};

const prepareRepeatedDocs = (extractLineageService, doc, repeated) => {
  const childData = repeated && repeated.child_data || [];
  return childData.map(child => {
    child.parent = extractLineageService.extract(doc);
    return prepare(child);
  });
};

const prepareSubmittedDocsForSave = (contactServices, dbService, original, submitted, type) => {
  if(original) {
    _defaults(submitted.doc, original);
  } else if(contactServices.contactTypes.isHardcodedType(type)) {
    // default hierarchy - maintain backwards compatibility
    submitted.doc.type = type;
  } else {
    // configured hierarchy
    submitted.doc.type = 'contact';
    submitted.doc.contact_type = type;
  }

  const doc = prepare(submitted.doc);

  return prepareAndAttachSiblingDocs(
    contactServices.extractLineage,
    dbService,
    submitted.doc,
    original,
    submitted.siblings
  ).then((siblings) => {
    const extract = item => {
      item.parent = item.parent && contactServices.extractLineage.extract(item.parent);
      item.contact = item.contact && contactServices.extractLineage.extract(item.contact);
    };

    siblings.forEach(extract);
    extract(doc);

    // This must be done after prepareAndAttachSiblingDocs, as it relies
    // on the doc's parents being attached.
    const repeated = prepareRepeatedDocs(contactServices.extractLineage, submitted.doc, submitted.repeats);

    return {
      docId: doc._id,
      preparedDocs: [doc].concat(repeated, siblings) // NB: order matters: #4200
    };
  });
};

const applyTransitions = (transitionsService, preparedDocs) => {
  return transitionsService
    .applyTransitions(preparedDocs.preparedDocs)
    .then(updatedDocs => {
      preparedDocs.preparedDocs = updatedDocs;
      return preparedDocs;
    });
};

const generateFailureMessage = (bulkDocsResult) => {
  return _reduce(bulkDocsResult, (msg, result) => {
    let newMsg = msg;
    if(!result.ok) {
      if(!newMsg) {
        newMsg = 'Some documents did not save correctly: ';
      }
      newMsg += result.id + ' with ' + result.message + '; ';
    }
    return newMsg;
  }, null);
};

class ContactSaver {
  constructor(
    contactServices,
    fileServices,
    transitionsService
  ) {
    this.contactServices = contactServices;
    this.fileServices = fileServices;
    this.transitionsService = transitionsService;
  }

  save(form, docId, type, xmlVersion) {
    return (docId ? this.fileServices.db.get().get(docId) : Promise.resolve())
      .then(original => {
        const submitted = EnketoDataTranslator.contactRecordToJs(form.getDataStr({ irrelevant: false }));
        return prepareSubmittedDocsForSave(
          this.contactServices,
          this.fileServices.db,
          original,
          submitted,
          type
        );
      })
      .then((preparedDocs) => applyTransitions(this.transitionsService, preparedDocs))
      .then((preparedDocs) => {
        if (xmlVersion) {
          for (const doc of preparedDocs.preparedDocs) {
            doc.form_version = xmlVersion;
          }
        }
        return this.fileServices.db
          .get()
          .bulkDocs(preparedDocs.preparedDocs)
          .then((bulkDocsResult) => {
            const failureMessage = generateFailureMessage(bulkDocsResult);

            if(failureMessage) {
              throw new Error(failureMessage);
            }

            // TODO Not sure we need to return bulkDocsResult
            return { docId: preparedDocs.docId, preparedDocs: preparedDocs.preparedDocs };
          });
      });
  }
}

module.exports = ContactSaver;
