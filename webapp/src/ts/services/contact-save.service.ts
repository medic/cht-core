import { v7 as uuid } from 'uuid';
import { Injectable, NgZone } from '@angular/core';
import { defaults as _defaults, isObject as _isObject } from 'lodash-es';

import { EnketoTranslationService } from '@mm-services/enketo-translation.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { AttachmentService } from '@mm-services/attachment.service';
import { AttachmentRoutingService } from '@mm-services/attachment-routing.service';
import { AttachmentRoutingStrategy, FieldPath, computeFieldPath } from '@mm-services/attachment-routing';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { Contact, Qualifier } from '@medic/cht-datasource';

interface ContactOwnerContext {
  root: Element;
  preparedDocs: Record<string, any>[];
  mainDoc: Record<string, any>;
  submittedRepeatsLen: number;
}

@Injectable({
  providedIn: 'root'
})
export class ContactSaveService {
  private readonly CONTACT_FIELD_NAMES = [ 'parent', 'contact' ];
  private readonly REPEAT_CHILD_NODE_NAME = 'child';
  private readonly getContactFromDatasource: ReturnType<typeof Contact.v1.get>;

  constructor(
    private readonly attachmentRoutingService: AttachmentRoutingService,
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
        this.processAllAttachments(preparedDocs, submitted, xmlStr);

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
      doc._id = uuid();
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

  private processAllAttachments(
    preparedDocs: Record<string, any>[],
    submitted: { doc; siblings?; repeats? },
    xmlStr: string,
  ) {
    const ctx: ContactOwnerContext = {
      root: $.parseXML(xmlStr).documentElement,
      preparedDocs,
      mainDoc: preparedDocs[0],
      submittedRepeatsLen: submitted?.repeats?.child_data?.length ?? 0
    };

    this.attachmentRoutingService.route(this.contactRoutingStrategy(ctx));
  }

  /**
   * Contact pipeline's attachment-routing strategy. Owner resolution classifies
   * the element's section (main / sibling / repeat `<child>`); the formId is the
   * form-instance root's id; field paths are plain dot-paths relative to the
   * field's section container (contact repeats are separate docs, never arrays).
   */
  private contactRoutingStrategy(ctx: ContactOwnerContext): AttachmentRoutingStrategy {
    return {
      root: ctx.root,
      docs: ctx.preparedDocs,
      mainDoc: ctx.mainDoc,
      resolveOwnerForNode: (element: Element) => this.resolveContactOwnerDoc(element, ctx),
      formIdFor: () => $(ctx.root).attr('id'),
      fieldPathFor: (element: Element): FieldPath | null => {
        const container = this.findFieldContainerElement(element, ctx);
        return container ? computeFieldPath(element, container) : null;
      },
    };
  }

  private findSectionForElement(el: Element, root: Element): Element | null {
    let section: Element = el;
    while (section.parentNode && section.parentNode !== root) {
      section = section.parentNode as Element;
    }
    return section.parentNode === root ? section : null;
  }

  private isMainSection(section: Element, root: Element): boolean {
    const ignored = new Set([ 'meta', 'inputs', 'repeat' ]);
    const firstSection = (Array.from(root.children) as Element[])
      .find(c => !ignored.has(c.tagName) && c.childElementCount > 0);
    return section === firstSection;
  }

  private findSiblingDoc(
    section: Element,
    preparedDocs: Record<string, any>[],
    mainDoc: Record<string, any>,
  ): Record<string, any> {
    const siblingId = mainDoc[section.tagName]?._id;
    return preparedDocs.find((d: Record<string, any>) => d._id === siblingId) ?? mainDoc;
  }

  private findRepeatDoc(
    section: Element,
    el: Element,
    preparedDocs: Record<string, any>[],
    submittedRepeatsLen: number,
  ): Record<string, any> | null {
    // a <repeat> can also serialize non-<child> nodes (e.g. child_count); skip them
    const repeatChildren = (Array.from(section.children) as Element[])
      .filter(c => c.tagName === this.REPEAT_CHILD_NODE_NAME);
    const childIdx = repeatChildren.findIndex(c => c.contains(el));
    if (childIdx >= 0 && childIdx < submittedRepeatsLen) {
      return preparedDocs[1 + childIdx];
    }
    return null;
  }

  /**
   * The element whose children map 1:1 to the owner doc's top-level fields:
   * the section itself for main/sibling, the i-th `<child>` of `<repeat>` for
   * repeats. Anchors `computeFieldPath`.
   */
  private findFieldContainerElement(el: Element, ctx: ContactOwnerContext): Element | null {
    const section = this.findSectionForElement(el, ctx.root);
    if (!section) {
      return null;
    }
    if (section.tagName === 'repeat') {
      const repeatChildren = (Array.from(section.children) as Element[])
        .filter(c => c.tagName === this.REPEAT_CHILD_NODE_NAME);
      return repeatChildren.find(c => c.contains(el)) ?? null;
    }
    return section;
  }

  /**
   * Resolves the prepared sub-doc that owns an XML element by walking up to its
   * section root (a direct child of the form root):
   *
   *   - main section (first non-meta/inputs/repeat element child of root) -> preparedDocs[0]
   *   - <contact> / <parent> peer of main section -> sibling doc with matching _id
   *   - <repeat>'s i-th <child> -> preparedDocs[1 + i] (repeats precede siblings in concat)
   *   - anything else (meta, inputs, unknown) -> mainDoc
   */
  private resolveContactOwnerDoc(el: Element, ctx: ContactOwnerContext): Record<string, any> {
    const { root, preparedDocs, mainDoc, submittedRepeatsLen } = ctx;
    const section = this.findSectionForElement(el, root);
    if (!section || this.isMainSection(section, root)) {
      return mainDoc;
    }
    if (this.CONTACT_FIELD_NAMES.includes(section.tagName)) {
      return this.findSiblingDoc(section, preparedDocs, mainDoc);
    }
    if (section.tagName === 'repeat') {
      return this.findRepeatDoc(section, el, preparedDocs, submittedRepeatsLen) ?? mainDoc;
    }
    return mainDoc;
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
