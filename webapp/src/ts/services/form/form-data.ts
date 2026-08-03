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

  public findNodeWithTextContent(textContent: string) {
    // XPath query is not viable here because attachment filenames can contain chars that break the XPath (e.g. ")
    return Array
      .from(this.rootElement.querySelectorAll('*'))
      .filter(node => node.textContent === textContent)
      .find(element => !this.isInSubDbDoc(element)) ?? null;
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

  private getJsValueForNode(node: Element, repeatPaths: string[], nodePath: string) {
    const elements = this.getChildElements(node);
    return elements.length ? this.nodesToJs(elements, repeatPaths, nodePath) : node.textContent;
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
    const hasCustomAttachmentName = (fileName: string) => !fileName.startsWith(USER_FILE_ATTACHMENT_PREFIX)
      && !fileName.startsWith(`${USER_BINARY_ATTACHMENT_PREFIX}/`);
    const isExistingFileAttachment = (fileName: string) => fileName.startsWith(USER_FILE_ATTACHMENT_PREFIX)
      && this.findNodeWithTextContent(fileName.slice(USER_FILE_ATTACHMENT_PREFIX.length));
    const binaryAttachments = this.binaryTypeElements
      .map(element => this.buildBinaryAttachmentData(originalAttachments, element))
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
      // Keep custom attachments and existing file attachments still referenced by a field
      .filter(([key]) => hasCustomAttachmentName(key) || isExistingFileAttachment(key))
      .reduce((existingAttachments, [key, attachment]) => ({ ...existingAttachments, [key]: attachment }), {});

    const attachments = {
      ...existingAttachments,
      ...newFileAttachments,
      ...binaryAttachments
    };
    return Object.keys(attachments).length ? attachments : undefined;
  }

  private isInSubDbDoc(element: Element) {
    const nearestDbDoc = element.closest(DB_DOC_SELECTOR);
    return !!nearestDbDoc && nearestDbDoc !== this.rootElement && this.rootElement.contains(nearestDbDoc);
  }

  private buildBinaryAttachmentData(originalAttachments: Record<string, any>, element: Element) {
    const rootXpath = Xpath.getElementTreeXPath(this.rootElement);
    const xpath = Xpath.getElementTreeXPath(element);
    const relativeXpath = xpath.slice(rootXpath.length);
    const filename = `${USER_BINARY_ATTACHMENT_PREFIX}${relativeXpath}`;
    const data = element.textContent;
    element.textContent = '';
    return {
      filename,
      // Currently do not support loading binary attachment data into edit form. So, keep existing value.
      attachment: data ? { data, content_type: 'image/png' } : originalAttachments[filename]
    };
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
    const liftIdValue = (idValue: unknown) => typeof idValue === 'string' ? { _id: idValue } : idValue;
    return new (class extends EnketoFormData {
      public override deserializeDoc(
        formConfig: FormConfig,
        reportedDate: number,
        originalDoc?: Record<string, any>
      ): Record<string, any> {
        const doc = super.deserializeDoc(formConfig, reportedDate, originalDoc);
        return {
          ...doc,
          parent: liftIdValue(doc.parent),
          contact: liftIdValue(doc.contact)
        };
      }
    })(this.rootContactElement, this.id);
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
