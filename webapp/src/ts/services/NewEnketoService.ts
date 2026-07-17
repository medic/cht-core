import { Injectable, NgZone } from '@angular/core';
import events from 'enketo-core/src/js/event';
import { DOC_TYPES } from '@medic/constants';
import { v7 as uuid } from 'uuid';
import { Xpath } from '@mm-providers/xpath-element-path.provider';
import * as FileManager from '../../js/enketo/file-manager';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { Contact, Qualifier } from '@medic/cht-datasource';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { FormConfig } from '@mm-services/xml-forms.service';
import { isHardcodedType } from '@medic/contact-types-utils';

@Injectable({
  providedIn: 'root'
})
export class NewEnketoService {
  private readonly USER_FILE_ATTACHMENT_PREFIX = 'user-file-';
  private readonly getContactFromDatasource: ReturnType<typeof Contact.v1.get>;

  constructor(
    private readonly extractLineageService:ExtractLineageService,
    private readonly ngZone: NgZone,
    chtDatasourceService: CHTDatasourceService,
  ) {
    this.getContactFromDatasource = chtDatasourceService.bind(Contact.v1.get);
  }

  public async saveContact(
    { config, form }: EnketoForm,
    defaultData: Record<string, any>
  ) {
    return this.ngZone.runOutsideAngular(async () => {
      await this.validate(form);
      const contactDoc = this.initializeDoc(defaultData);
      const formDocData = new EnektoContactRootDoc(
        this.getFormDataXml(form),
        contactDoc._id,
        isHardcodedType(contactDoc.type) ? contactDoc.type : contactDoc.contact_type
      );

      const formAttachments = this.processFormAttachments(config.doc.internalId, formDocData, contactDoc._attachments);

      const rootOutputDoc: Record<string, any> = {
        ...contactDoc,
        ...formDocData.deserializeDoc(config),
        type: contactDoc.type,
        contact_type: contactDoc.contact_type,
        _attachments: formAttachments
      };

      const siblings = EnektoContactRootDoc.SIBLING_FIELD_NAMES
        .map(fieldName => ({ fieldName, doc: formDocData.getSiblingDoc(fieldName)?.deserializeDoc(config) }))
        .map(({ fieldName, doc }) => ({ fieldName, doc: this.initializeContactSibling(rootOutputDoc, doc)}));
      await Promise.all(siblings.map(async ({ fieldName, doc }) => {
        rootOutputDoc[fieldName] = await this.getContactSiblingValue(
          doc, rootOutputDoc[fieldName], defaultData[fieldName]
        );
      }));
      const outputSiblings = siblings
        .filter(({ fieldName, doc }) => doc && rootOutputDoc[fieldName] === doc)
        .map(({ doc }) => doc)
        .filter(doc => !!doc);

      const childDocs = formDocData
        .getChildDocs()
        .map(doc => this.initializeDoc(doc.deserializeDoc(config)))
        .map(doc => ({ ...doc, parent: rootOutputDoc }));

      return {
        docId: rootOutputDoc._id,
        preparedDocs: [rootOutputDoc, ...outputSiblings, ...childDocs]
          .map(doc => this.dehydrateContactLineage(doc))
      };
    });
  }

  public async saveReport(
    { config, form }: EnketoForm,
    defaultData: Record<string, any>
  ) {
    return this.ngZone.runOutsideAngular(async () => {
      await this.validate(form);
      const { internalId, xmlVersion } = config.doc;
      const reportDoc: Record<string, any> = this.initializeReportDoc(internalId, xmlVersion, defaultData);
      const formDocData = new EnketoReportRootDoc(this.getFormDataXml(form), reportDoc._id);
      const subDocs = formDocData.getDbDocs();

      this.populateDbDocRefElements(formDocData, [formDocData, ...subDocs]);
      const attachments = this.processFormAttachments(config.doc.internalId, formDocData, reportDoc._attachments);

      const rootOutputDoc: Record<string, any> = {
        ...reportDoc,
        hidden_fields: this.getHiddenFields([
          ...formDocData.hiddenElements,
          ...subDocs.map(({ rootElement }) => rootElement)
        ]),
        fields: formDocData.deserialize(config),
        _attachments: attachments
      };

      const dbDocObjects = subDocs.map(docData => this.initializeDoc(docData.deserializeDoc(config)));
      return [rootOutputDoc, ...dbDocObjects];
    });
  }

  private async validate(form: Record<string, any>) {
    const valid = await form.validate();
    if (!valid) {
      throw new FormValidationError();
    }
    form.view.html.dispatchEvent(events.BeforeSave());
  }

  private getFormDataXml(form: Record<string, any>) {
    const formString = form.getDataStr({ irrelevant: false });
    return new DOMParser().parseFromString(formString, 'text/xml');
  }

  private dehydrateContactLineage(contactDoc: Record<string, any>) {
    return {
      ...contactDoc,
      parent: this.extractLineageService.extract(contactDoc.parent),
      contact: this.extractLineageService.extract(contactDoc.contact)
    };
  }

  private initializeContactSibling(
    rootContactDoc: Record<string, any>,
    rawSibling?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!rawSibling) {
      return;
    }
    return {
      type: 'person', // legacy support - form data should override this
      ...this.initializeDoc(rawSibling),
      parent: rawSibling.parent === 'PARENT' ? { ...rootContactDoc } : rawSibling.parent
    };
  }

  private async getContactSiblingValue(
    sibling?: Record<string, any>,
    currentValue?: Record<string, string>,
    defaultValue?: Record<string, unknown>
  ) {
    if (!currentValue?._id) {
      return undefined;
    }
    if (currentValue._id === 'NEW') {
      return sibling;
    } else if (currentValue?._id === defaultValue?._id) {
      return defaultValue;
    }

    return await this.getContactFromDatasource(Qualifier.byUuid(currentValue?._id));
  }

  private getHiddenFields(elements: Element[]) {
    const hiddenXpaths = new Set<string>(elements.map((element) => Xpath.getElementRawXPath(element)));
    const hasHiddenAncestor = (
      segments: string[]
    ) => (_: string, i: number) => i > 0 && hiddenXpaths.has(segments.slice(0, i).join('/'));
    return [...hiddenXpaths]
      .map(xpath => xpath.split('/'))
      .filter(segments => !segments.some(hasHiddenAncestor(segments)))
      .map(segments => segments
        .filter(Boolean)
        .slice(1)
        .join('.'));
  }

  private initializeDoc(defaultData: Record<string, any>): Record<string, any> {
    return {
      _id: defaultData._id || uuid(),
      reported_date: Date.now(),
      ...defaultData
    };
  }

  private initializeReportDoc(form: string, formVersion: string, defaultData: Record<string, any>) {
    return {
      form,
      type: DOC_TYPES.DATA_RECORD,
      content_type: 'xml',
      from: defaultData.contact?.phone,
      ...this.initializeDoc(defaultData),
      contact: this.extractLineageService.extract(defaultData.contact),
      form_version: formVersion
    };
  }

  private populateDbDocRefElements(rootDoc: EnketoReportRootDoc, allDocs: EnketoDoc[]) {
    rootDoc.dbDocRefElements.forEach(element => {
      const reference = element.getAttribute('db-doc-ref');
      const referencedNode = rootDoc.getNodeByXpath(element, reference);
      if (!referencedNode) {
        return;
      }
      const refDoc = allDocs.find(({ rootElement }) => rootElement === referencedNode);
      if (refDoc) {
        element.textContent = refDoc.id;
      }
    });
  }

  private processFormAttachments(
    form: string,
    rootDocData: EnketoRootDoc,
    originalAttachments: Record<string, any> = {}
  ) {
    const binaryAttachments = rootDocData.binaryTypeElements
      .map(element => {
        const xpath = Xpath.getElementTreeXPath(element);
        const formXpath = xpath.replace(/^\/[^/]+/, `/${form}`);
        const filename = `user-file${formXpath}`;
        const data = element.textContent;
        element.textContent = '';
        return {
          filename,
          // Currently do not support loading binary attachment data into edit form. So, keep existing value.
          attachment: data ? { data, content_type: 'image/png' } : originalAttachments[filename]
        };
      })
      .filter(({ attachment }) => attachment)
      .reduce((acc, { filename, attachment }) => ({ ...acc, [filename]: attachment }), {});
    const newFileAttachments = FileManager
      .getCurrentFiles()
      .reduce((acc, file) => ({
        ...acc,
        [`${this.USER_FILE_ATTACHMENT_PREFIX}${file.name}`]: {
          content_type: file.type,
          data: new Blob([ file ], { type: file.type })
        }
      }), {});
    const existingFileAttachments = Object
      .entries(originalAttachments)
      .filter(([key]) => key.startsWith(this.USER_FILE_ATTACHMENT_PREFIX))
      // Keep existing file attachments still referenced by a field
      .filter(([key]) => rootDocData.findNodeWithTextContent(key.slice(this.USER_FILE_ATTACHMENT_PREFIX.length)))
      .reduce((acc, [key, attachment]) => ({ ...acc, [key]: attachment }), {});

    const attachments = {
      ...existingFileAttachments,
      ...newFileAttachments,
      ...binaryAttachments
    };
    return Object.keys(attachments).length ? attachments : undefined;
  }
}

export interface EnketoForm {
  form: Record<string, any>
  config: FormConfig
}

// Thrown when the form fails Enketo validation. Enketo displays the per-field validation messages itself,
// so callers should handle this silently (unlike other save errors).
export class FormValidationError extends Error {
  constructor(message = 'Form is invalid') {
    super(message);
    this.name = 'FormValidationError';
  }
}

class EnketoDoc {
  constructor(
    public readonly rootElement: Element,
    public readonly id: string,
  ) {
  }

  public deserialize(formConfig: FormConfig): Record<string, any> {
    return this.nodesToJs(
      this.getChildElements(this.rootElement),
      formConfig.repeatPaths,
      Xpath.getElementRawXPath(this.rootElement)
    );
  }

  public deserializeDoc(formConfig: FormConfig): Record<string, any> {
    return {
      _id: this.id,
      form_version: formConfig.doc.xmlVersion,
      ...this.deserialize(formConfig)
    };
  }

  protected isElementNode(node: unknown): node is Element {
    return node?.['nodeType'] === Node.ELEMENT_NODE;
  }

  protected getChildElements(node: Node) {
    return Array
      .from(node.childNodes)
      .filter(this.isElementNode);
  }

  // TODO Any methods not using actual state could maybe be moved to helper.
  protected nodesToJs(nodes: Element[], repeatPaths: string[], path: string) {
    return nodes
      .reduce<Record<string, any>>((result, node) => {
        const nodePath = `${path}/${node.nodeName}`;
        const value = this.getJsValueForNode(node, repeatPaths, nodePath);
        if (repeatPaths.includes(nodePath)) {
          result[node.nodeName] ??= [];
          result[node.nodeName].push(value);
        } else {
          result[node.nodeName] = value;
        }
        return result;
      }, {});
  }

  private getJsValueForNode(node: Element, repeatPaths: string[], nodePath: string) {
    const elements = Array
      .from(node.childNodes)
      .filter(this.isElementNode);
    if (elements.length) {
      return this.nodesToJs(elements, repeatPaths, nodePath);
    }
    return node.textContent;
  }

  protected findChildNode(element: Element, tagName: string) {
    return Array
      .from(element.children)
      .find(child => child.tagName === tagName);
  }

  protected getDocId(element: Element) {
    return this.findChildNode(element, '_id')?.textContent || uuid();
  }
}

class EnketoRootDoc extends EnketoDoc {
  public readonly binaryTypeElements: Element[];

  constructor(
    protected readonly xmlDoc: XMLDocument,
    id: string,
  ) {
    super(xmlDoc.documentElement, id);
    this.binaryTypeElements = Array.from(this.rootElement.querySelectorAll('[type=binary i]'));
  }

  public findNodeWithTextContent(textContent: string) {
    const result = this.xmlDoc.evaluate(
      `.//*[text()=${JSON.stringify(textContent)}]`,
      this.rootElement,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  }
}

class EnektoContactRootDoc extends EnketoRootDoc {
  public static readonly SIBLING_FIELD_NAMES = ['parent', 'contact'] as const;
  private readonly childElements: Element[];
  private readonly rootContactElement: Element;

  constructor(
    xmlDoc: XMLDocument,
    id: string,
    type: string,
  ) {
    super(xmlDoc, id);
    this.childElements = Array.from(this.rootElement.querySelectorAll(':scope > repeat > child'));
    const elementForType = this.findChildNode(this.rootElement, type);
    if (!elementForType) {
      // Fail loudly here because previous save logic was very "flexible" around the naming of this group. However, the
      // contact form documentation and the prepopulation logic when rendering the form both clearly intend for the
      // contact's data to be loaded from the group with the name of the contact type.
      throw new Error(
        `Failed to save contact form because the data for the contact is not contained in the ${type} group.`
      );
    }
    this.rootContactElement = elementForType;
  }

  public deserializeDoc(formConfig: FormConfig): Record<string, any> {
    const rootDoc = new EnketoDoc(this.rootContactElement, this.id).deserializeDoc(formConfig);
    const liftIdValue = (idValue: unknown) => typeof idValue === 'string' ? { _id: idValue } : idValue;
    return {
      ...rootDoc,
      parent: liftIdValue(rootDoc.parent),
      contact: liftIdValue(rootDoc.contact)
    };
  }

  public getChildDocs() {
    return this.childElements.map(dbDoc => new EnketoDoc(
      dbDoc,
      this.getDocId(dbDoc),
    ));
  }

  public getSiblingDoc(fieldName: typeof EnektoContactRootDoc.SIBLING_FIELD_NAMES[number]) {
    const element = this.findChildNode(this.rootElement, fieldName);
    return element ? new EnketoDoc(element, this.getDocId(element)) : null;
  }
}

class EnketoReportRootDoc extends EnketoRootDoc {
  private readonly dbDocElements: Element[];
  public readonly hiddenElements: Element[];
  public readonly dbDocRefElements: Element[];

  constructor(
    xmlDoc: XMLDocument,
    id: string,
  ) {
    super(xmlDoc, id);
    this.dbDocElements = Array.from(this.rootElement.querySelectorAll('[db-doc=true i]'));
    this.hiddenElements = Array.from(this.rootElement.querySelectorAll('[tag=hidden i]'));
    this.dbDocRefElements = Array.from(this.rootElement.querySelectorAll('[db-doc-ref]'));
  }

  public getDbDocs() {
    return this.dbDocElements.map(dbDoc => new EnketoDoc(
      dbDoc,
      this.getDocId(dbDoc),
    ));
  }

  public getNodeByXpath(contextNode: Node, rawXpath?: string | null): Node | null {
    const xpath = rawXpath?.trim();
    if (!xpath) {
      return null;
    }
    const xpathSegments = xpath
      .trim()
      .split('/')
      .filter(Boolean);
    const contextLineage = this.getNodeWithLineage(contextNode);

    // Number of leading segments the target path shares with the context node's lineage.
    const firstDivergence = xpathSegments
      .findIndex((segment, i) => segment !== contextLineage[i]?.nodeName);
    const commonAncestorIndex = firstDivergence === -1 ? xpathSegments.length : firstDivergence;

    // Fall back to contextNode in case of relative xpath
    const anchor = contextLineage[commonAncestorIndex - 1] ?? contextNode;
    const relativePath = xpathSegments.slice(commonAncestorIndex).join('/') || '.';
    const result = this.xmlDoc.evaluate(
      relativePath,
      anchor,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  }

  private getNodeWithLineage(contextNode?: Node | null, lineage: Node[] = []): Node[] {
    if (!this.isElementNode(contextNode)) {
      return lineage;
    }
    lineage.unshift(contextNode);
    return this.getNodeWithLineage(contextNode.parentNode, lineage);
  }
}


