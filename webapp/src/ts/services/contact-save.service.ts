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
  private readonly USER_FILE_ATTACHMENT_PREFIX = 'user-file-';
  private readonly getContactFromDatasource: ReturnType<typeof Contact.v1.get>;

  constructor(
    private enketoTranslationService:EnketoTranslationService,
    private extractLineageService:ExtractLineageService,
    private readonly attachmentService:AttachmentService,
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
    const mainDoc = preparedDocs[0];
    const newAttachmentNames = new Set<string>();

    // Attach files from FileManager (uploaded via file widgets)
    FileManager
      .getCurrentFiles()
      .forEach(file => {
        const attachmentName = `${this.USER_FILE_ATTACHMENT_PREFIX}${file.name}`;
        newAttachmentNames.add(attachmentName);
        this.attachmentService.add(mainDoc, attachmentName, file, file.type, false);
      });

    // Process binary fields from XML
    if (xmlStr) {
      const $record = $($.parseXML(xmlStr));
      const formId = $record.find(':first').attr('id');

      $record
        .find('[type=binary]')
        .each((_idx, element) => {
          const content = $(element).text();
          if (content) {
            const xpath = Xpath.getElementXPath(element);
            // Replace instance root element node name with form internal ID
            const filename = this.USER_FILE_ATTACHMENT_PREFIX.slice(0, -1) +
              (xpath.startsWith('/' + formId) ? xpath : xpath.replace(/^\/[^/]+/, '/' + formId));
            newAttachmentNames.add(filename);
            this.attachmentService.add(mainDoc, filename, content, 'image/png', true);
          }
        });
    }

    // Remove orphaned user attachments that are no longer referenced
    const referencedAttachmentNames = this.findReferencedAttachments(mainDoc);
    const validAttachmentNames = new Set([...newAttachmentNames, ...referencedAttachmentNames]);
    this.removeOrphanedAttachments(mainDoc, validAttachmentNames);
  }

  private findReferencedAttachments(doc: Record<string, any>): Set<string> {
    const referenced = new Set<string>();
    if (!doc._attachments) {
      return referenced;
    }

    const existingAttachmentNames = Object.keys(doc._attachments);

    const isReferencedAttachment = (value: string): boolean => {
      if (!value) {
        return false;
      }
      const possibleAttachmentName = `${this.USER_FILE_ATTACHMENT_PREFIX}${value}`;
      return existingAttachmentNames.includes(possibleAttachmentName);
    };

    const scanValue = (value: any) => {
      if (typeof value === 'string' && isReferencedAttachment(value)) {
        referenced.add(`${this.USER_FILE_ATTACHMENT_PREFIX}${value}`);
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(scanValue);
        return;
      }

      if (value && typeof value === 'object') {
        Object.values(value).forEach(scanValue);
      }
    };

    Object.entries(doc).forEach(([key, value]) => {
      if (!key.startsWith('_')) {
        scanValue(value);
      }
    });

    return referenced;
  }

  private removeOrphanedAttachments(doc: Record<string, any>, validAttachmentNames: Set<string>) {
    if (!doc._attachments) {
      return;
    }

    Object.keys(doc._attachments)
      .filter(name => name.startsWith(this.USER_FILE_ATTACHMENT_PREFIX) && !validAttachmentNames.has(name))
      .forEach(name => this.attachmentService.remove(doc, name));
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
