import { FormConfig } from '@mm-services/form/form-config';
import { Xpath } from '@mm-providers/xpath-element-path.provider';
import { v7 as uuid } from 'uuid';
import * as FileManager from '../../../js/enketo/file-manager';

const USER_BINARY_ATTACHMENT_PREFIX = 'user-file';
const USER_FILE_ATTACHMENT_PREFIX = `${USER_BINARY_ATTACHMENT_PREFIX}-`;

const DB_DOC_SELECTOR = '[db-doc=true i]';

export class EnketoFormData {
  public readonly binaryTypeElements: Element[];

  constructor(
    public readonly rootElement: Element,
    public readonly id: string,
  ) {
    this.binaryTypeElements = Array
      .from(this.rootElement.querySelectorAll('[type=binary]'))
      .filter(element => !this.isInSubDbDoc(element));
  }

  public deserializeDoc(
    formConfig: FormConfig,
    reportedDate: number,
    originalDoc?: Record<string, any>
  ): Record<string, any> {
    // Resolve the attachments first because moving a binary value into an attachment clears the field value.
    const attachments = this.getDocAttachments(originalDoc?._attachments);
    return {
      ...originalDoc,
      ...this.deserialize(formConfig),
      _id: this.id,
      form_version: formConfig.doc.xmlVersion,
      reported_date: originalDoc?.reported_date || reportedDate,
      _attachments: attachments
    };
  }

  protected deserialize(formConfig: FormConfig): Record<string, any> {
    return this.nodesToJs(
      this.getChildElements(this.rootElement),
      formConfig.repeatPaths,
      Xpath.getElementRawXPath(this.rootElement)
    );
  }

  protected isElementNode(node: unknown): node is Element {
    return node?.['nodeType'] === Node.ELEMENT_NODE;
  }

  protected getChildElements(node: Node) {
    return Array
      .from(node.childNodes)
      .filter(this.isElementNode);
  }

  protected nodesToJs(nodes: Element[], repeatPaths: string[], path: string) {
    return nodes
      .map(node => ({ node, nodePath: `${path}/${node.nodeName}` }))
      .map(({ node, nodePath }) => ({ node, nodePath, value: this.getJsValueForNode(node, repeatPaths, nodePath) }))
      .reduce((acc, { node, nodePath, value }) => {
        if (repeatPaths.includes(nodePath)) {
          acc[node.nodeName] ??= [];
          acc[node.nodeName].push(value);
        } else {
          acc[node.nodeName] = value;
        }
        return acc;
      }, {});
  }

  protected findChildNode(element: Element, tagName: string) {
    return Array
      .from(element.children)
      .find(child => child.tagName === tagName);
  }

  protected getDocId(element: Element) {
    return this.findChildNode(element, '_id')?.textContent || uuid();
  }

  protected getDocAttachments(originalAttachments: Record<string, any> = {}) {
    const isOrphanedFileAttachment = (fileName: string) => fileName.startsWith(USER_FILE_ATTACHMENT_PREFIX)
      && !this.findNodeWithTextContent(fileName.slice(USER_FILE_ATTACHMENT_PREFIX.length));
    const binaryAttachments = this.binaryTypeElements
      .map(element => this.buildBinaryAttachmentData(element))
      .filter(({ attachment }) => attachment)
      .reduce((binaryAttachments, { filename, attachment }) => ({ ...binaryAttachments, [filename]: attachment }), {});
    const newFileAttachments = FileManager
      .getCurrentFiles()
      .filter(({ name }) => this.findNodeWithTextContent(name))
      .map(file => ({
        name: `${USER_FILE_ATTACHMENT_PREFIX}${file.name}`,
        content_type: file.type,
        data: new Blob([ file ], { type: file.type })
      }))
      .reduce((attachments, { name, content_type, data }) => ({ ...attachments, [name]: { content_type, data } }), {});
    const existingAttachments = Object
      .entries(originalAttachments)
      // Keep custom/binary attachments and existing file attachments still referenced by a field
      .filter(([key]) => !isOrphanedFileAttachment(key))
      .reduce((existingAttachments, [key, attachment]) => ({ ...existingAttachments, [key]: attachment }), {});

    const attachments = {
      ...existingAttachments,
      ...newFileAttachments,
      ...binaryAttachments
    };
    return Object.keys(attachments).length ? attachments : undefined;
  }

  private findNodeWithTextContent(textContent: string) {
    // XPath query is not viable here because attachment filenames can contain chars that break the XPath (e.g. ")
    return Array
      .from(this.rootElement.querySelectorAll('*'))
      .filter(node => node.textContent === textContent)
      .find(element => !this.isInSubDbDoc(element)) ?? null;
  }

  private getJsValueForNode(node: Element, repeatPaths: string[], nodePath: string) {
    const elements = this.getChildElements(node);
    return elements.length ? this.nodesToJs(elements, repeatPaths, nodePath) : node.textContent;
  }

  private isInSubDbDoc(element: Element) {
    const nearestDbDoc = element.closest(DB_DOC_SELECTOR);
    return !!nearestDbDoc && nearestDbDoc !== this.rootElement && this.rootElement.contains(nearestDbDoc);
  }

  private buildBinaryAttachmentData(element: Element) {
    const rootXpath = Xpath.getElementTreeXPath(this.rootElement);
    const xpath = Xpath.getElementTreeXPath(element);
    const relativeXpath = xpath.slice(rootXpath.length);
    const filename = `${USER_BINARY_ATTACHMENT_PREFIX}${relativeXpath}`;
    const data = element.textContent;
    element.textContent = '';
    return {
      filename,
      attachment: data ? { data, content_type: 'image/png' } : null
    };
  }
}

/**
 * Custom logic for the root contact in a contact form.
 */
class EnketoRootContactData extends EnketoFormData {
  public override deserializeDoc(
    formConfig: FormConfig,
    reportedDate: number,
    originalDoc?: Record<string, any>
  ): Record<string, any> {
    // Need to double-check existing file attachments since contact edit forms might only have a subset of fields.
    // The default deserialize logic could drop attachments associated with properties not included in edit form.
    const originalFileAttachmentEntries = Object
      .entries(originalDoc?._attachments || {})
      .filter(([key]) => key.startsWith(USER_FILE_ATTACHMENT_PREFIX));
    const doc = super.deserializeDoc(formConfig, reportedDate, originalDoc);
    const existingFileAttachments = originalFileAttachmentEntries
      .filter(([key]) => this.hasPropertyWithValue(key.slice(USER_FILE_ATTACHMENT_PREFIX.length), doc))
      .reduce((existingAttachments, [key, attachment]) => ({ ...existingAttachments, [key]: attachment }), {});
    const attachments = {
      ...existingFileAttachments,
      ...doc._attachments
    };
    return {
      ...doc,
      parent: this.liftIdValue(doc.parent),
      contact: this.liftIdValue(doc.contact),
      _attachments: Object.keys(attachments).length ? attachments : undefined
    };
  }

  private liftIdValue(idValue: unknown) {
    return typeof idValue === 'string' ? { _id: idValue } : idValue;
  }

  private hasPropertyWithValue(value: string, obj: Record<string, any>): boolean {
    return Object
      .values(obj)
      .some(propertyValue => propertyValue && typeof propertyValue === 'object'
        ? this.hasPropertyWithValue(value, propertyValue)
        : propertyValue === value);
  }
}

export class EnketoContactFormData extends EnketoFormData {
  public static readonly SIBLING_FIELD_NAMES = ['parent', 'contact'] as const;
  private readonly childElements: Element[];
  private readonly rootContactElement: Element;

  constructor(xmlDoc: XMLDocument, id: string, type: string) {
    super(xmlDoc.documentElement, id);
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

  public getContactData() {
    return new EnketoRootContactData(this.rootContactElement, this.id);
  }

  public getChildData() {
    return this.childElements.map(dbDoc => new EnketoFormData(dbDoc, this.getDocId(dbDoc)));
  }

  public getSiblingData(fieldName: typeof EnketoContactFormData.SIBLING_FIELD_NAMES[number]) {
    const element = this.findChildNode(this.rootElement, fieldName);
    return element ? new EnketoFormData(element, this.getDocId(element)) : null;
  }
}

export class EnketoReportFormData extends EnketoFormData {
  private readonly dbDocElements: Element[];
  public readonly hiddenElements: Element[];
  public readonly dbDocRefElements: Element[];

  constructor(xmlDoc: XMLDocument, id: string) {
    super(xmlDoc.documentElement, id);
    this.dbDocElements = Array.from(this.rootElement.querySelectorAll(DB_DOC_SELECTOR));
    this.hiddenElements = Array.from(this.rootElement.querySelectorAll('[tag=hidden i]'));
    this.dbDocRefElements = Array.from(this.rootElement.querySelectorAll('[db-doc-ref]'));
  }

  public override deserializeDoc(
    formConfig: FormConfig,
    reportedDate: number,
    originalDoc?: Record<string, any>
  ): Record<string, any> {
    // Resolve the attachments first because moving a binary value into an attachment clears the field value.
    const attachments = this.getDocAttachments(originalDoc?._attachments);
    return {
      ...originalDoc,
      _id: this.id,
      form_version: formConfig.doc.xmlVersion,
      reported_date: originalDoc?.reported_date || reportedDate,
      fields: this.deserialize(formConfig),
      _attachments: attachments
    };
  }

  public getDbDocData() {
    const dbDocs = this.dbDocElements.map(dbDoc => new EnketoFormData(
      dbDoc,
      this.getDocId(dbDoc)
    ));
    const allData = [this, ...dbDocs];
    // Populate the db-doc-ref elements
    this.dbDocRefElements.forEach(element => {
      const referencedDoc = this.findReferencedDoc(element, element.getAttribute('db-doc-ref'), allData);
      if (referencedDoc) {
        element.textContent = referencedDoc.id;
      }
    });
    return dbDocs;
  }

  private findReferencedDoc(refElement: Element, reference: string | null, allData: EnketoFormData[]) {
    const target = reference?.trim().replace(/^\.?\//, ''); // strip leading "./" or "/"
    if (!target) {
      return;
    }
    const matches = allData.filter(({ rootElement }) => {
      const path = Xpath.getElementRawXPath(rootElement).replace(/^\//, ''); // strip leading "/"
      return path === target || path.endsWith(`/${target}`);
    });

    // For the docs that match the path tail, find the one with the closest ancestor node to the refElement.
    for (let ancestor: Element | null = refElement; ancestor; ancestor = ancestor.parentElement) {
      const match = matches.find(({ rootElement }) => ancestor?.contains(rootElement));
      if (match) {
        return match;
      }
    }
  }
}
