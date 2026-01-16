import { v4 as uuidV4 } from 'uuid';
import { Injectable, NgZone } from '@angular/core';
import { defaults as _defaults, isObject as _isObject } from 'lodash-es';

import { EnketoTranslationService } from '@mm-services/enketo-translation.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { AttachmentService } from '@mm-services/attachment.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { Contact, Qualifier } from '@medic/cht-datasource';
import { Xpath } from '@mm-providers/xpath-element-path.provider';
import FileManager from '../../js/enketo/file-manager';

@Injectable({
  providedIn: 'root'
})
export class ContactSaveService {
  private readonly CONTACT_FIELD_NAMES = [ 'parent', 'contact' ];
  private readonly getContactFromDatasource: ReturnType<typeof Contact.v1.get>;

  constructor(
    private enketoTranslationService:EnketoTranslationService,
    private extractLineageService:ExtractLineageService,
    private attachmentService:AttachmentService,
    private ngZone:NgZone,
    chtDatasourceService: CHTDatasourceService,
  ) {
    this.getContactFromDatasource = chtDatasourceService.bind(Contact.v1.get);
  }

  private prepareSubmittedDocsForSave(original, submitted, typeFields, xmlStr: string) {
    if (original) {
      _defaults(submitted.doc, original);
    } else {
      Object.assign(submitted.doc, typeFields);
    }

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

        // Process attachments for all documents
        const preparedDocs = [ doc ].concat(repeated, siblings); // NB: order matters: #4200
        this.processAllAttachments(preparedDocs, xmlStr);

        return {
          docId: doc._id,
          preparedDocs: preparedDocs
        };
      });
  }

  // Prepares document to be bulk-saved at a later time, and for it to be
  // referenced by _id by other docs if required.
  private prepare(doc): Record<string, any> {
    if (!doc._id) {
      doc._id = uuidV4();
    }

    if (!doc._rev) {
      doc.reported_date = Date.now();
    }

    return doc;
  }

  private prepareRepeatedDocs(doc, repeated) {
    const childData = repeated?.child_data || [];
    return childData.map(child => {
      child.parent = this.extractLineageService.extract(doc);
      return this.prepare(child);
    });
  }

  private processAllAttachments(preparedDocs: Record<string, any>[], xmlStr: string) {
    // Get files from FileManager (uploaded via file widgets)
    // For now, attach file widgets to the main document (first doc)
    // TODO: Map file widgets to correct document based on field location
    const mainDoc = preparedDocs[0];
    FileManager
      .getCurrentFiles()
      .forEach(file => {
        this.attachmentService.add(mainDoc, `user-file-${file.name}`, file, file.type, false);
      });

    // Process binary fields from XML and map to correct documents
    if (xmlStr) {
      this.processBinaryFieldsForAllDocs(preparedDocs, xmlStr);
    }
  }

  private processBinaryFieldsForAllDocs(preparedDocs: Record<string, any>[], xmlStr: string) {
    const $record = $($.parseXML(xmlStr));
    const formId = $record.find(':first').attr('id');

    // Build a map of document boundaries: which XPath prefixes correspond to which documents
    const docBoundaries = this.buildDocumentBoundaries($record, preparedDocs);

    $record
      .find('[type=binary]')
      .each((idx, element) => {
        const $element = $(element);
        const content = $element.text();
        if (content) {
          const xpath = Xpath.getElementXPath(element);
          // Replace instance root element node name with form internal ID
          const filename = 'user-file' +
            (xpath.startsWith('/' + formId) ? xpath : xpath.replace(/^\/[^/]+/, '/' + formId));

          // Find which document this attachment belongs to based on XPath
          const targetDoc = this.findTargetDocument(xpath, docBoundaries, preparedDocs);
          this.attachmentService.add(targetDoc, filename, content, 'image/png', true);
        }
      });
  }

  private buildDocumentBoundaries($record: JQuery<XMLDocument>, preparedDocs: Record<string, any>[]): Record<string, number> {
    // Map XPath prefixes to document indices
    // Example: '/data/clinic' -> 0 (main doc), '/data/contact' -> 1 (sibling)
    const boundaries: Record<string, number> = {};
    const rootElement = $record.find(':first')[0];
    const rootName = rootElement.nodeName;

    // Get direct children of root element
    const children = $(rootElement).children();
    children.each((idx, child) => {
      const childName = child.nodeName;
      const xpath = `/${rootName}/${childName}`;

      // Map xpath to document index
      // First child is main doc (index 0)
      // Subsequent children are siblings (starting from index 1, after any repeats)
      if (idx === 0) {
        boundaries[xpath] = 0; // main document
      } else {
        // For siblings, they appear after repeats in preparedDocs array
        // Since we don't have repeats yet, siblings start at index 1
        // TODO: Handle repeats properly
        boundaries[xpath] = preparedDocs.length - (children.length - idx);
      }
    });

    return boundaries;
  }

  private findTargetDocument(
    xpath: string,
    docBoundaries: Record<string, number>,
    preparedDocs: Record<string, any>[]
  ): Record<string, any> {
    // Find which document boundary this xpath falls under
    for (const [boundaryXpath, docIndex] of Object.entries(docBoundaries)) {
      if (xpath.startsWith(boundaryXpath)) {
        return preparedDocs[docIndex];
      }
    }

    // Default to main document if no match found
    return preparedDocs[0];
  }

  private extractIfRequired(name, value) {
    return this.CONTACT_FIELD_NAMES.includes(name) ? this.extractLineageService.extract(value) : value;
  }

  private prepareNewSibling(doc, fieldName, siblings) {
    const preparedSibling = this.prepare(siblings[fieldName]);

    // by default all siblings are "person" types but can be overridden
    // by specifying the type and contact_type in the form
    if (!preparedSibling.type) {
      preparedSibling.type = 'person';
    }

    if (preparedSibling.parent === 'PARENT') {
      delete preparedSibling.parent;
      // Cloning to avoid the circular references
      doc[fieldName] = { ...preparedSibling };
      // Because we're assigning the actual doc reference, the dbService.get.get
      // to attach the full parent to the doc will also attach it here.
      preparedSibling.parent = doc;
    } else {
      doc[fieldName] = this.extractIfRequired(fieldName, preparedSibling);
    }

    return preparedSibling;
  }

  private async getContact(doc, fieldName, contactId) {
    const dbFieldValue = await this.getContactFromDatasource(Qualifier.byUuid(contactId));
    // In a correctly configured form one of these will be the
    // parent. This must happen before we attempt to run
    // ExtractLineage on any siblings or repeats, otherwise they
    // will extract an incomplete lineage
    doc[fieldName] = this.extractIfRequired(fieldName, dbFieldValue);
  }

  // Mutates the passed doc to attach prepared siblings, and returns all
  // prepared siblings to be persisted.
  // This will (on a correctly configured form) attach the full parent to
  // doc, and in turn siblings. See internal comments.
  private prepareAndAttachSiblingDocs(doc, original, siblings) {
    if (!doc._id) {
      throw new Error('doc passed must already be prepared with an _id');
    }

    const preparedSiblings: Record<string, any>[] = [];
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
        const preparedSibling = this.prepareNewSibling(doc, fieldName, siblings);
        preparedSiblings.push(preparedSibling);
      } else if (original?.[fieldName]?._id === value) {
        doc[fieldName] = original[fieldName];
      } else {
        promiseChain = promiseChain.then(() => this.getContact(doc, fieldName, value));
      }
    });

    return promiseChain.then(() => preparedSiblings);
  }

  async save(form, docId, typeFields, xmlVersion) {
    return this.ngZone.runOutsideAngular(async () => {
      const original = docId ? await this.getContactFromDatasource(Qualifier.byUuid(docId)) : null;
      const xmlStr = form.getDataStr({ irrelevant: false });
      const submitted = this.enketoTranslationService.contactRecordToJs(xmlStr);
      const docData = await this.prepareSubmittedDocsForSave(original, submitted, typeFields, xmlStr);
      if (xmlVersion) {
        for (const doc of docData.preparedDocs) {
          doc.form_version = xmlVersion;
        }
      }
      return docData;
    });
  }
}
