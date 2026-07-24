import { FormConfig } from '@mm-services/form/form-config';
import { Xpath } from '@mm-providers/xpath-element-path.provider';
import { v7 as uuid } from 'uuid';

export class EnketoFormData {
  constructor(
    public readonly rootElement: Element,
    public readonly id: string,
  ) { }

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
}

export abstract class EnketoRootFormData extends EnketoFormData {
  public readonly binaryTypeElements: Element[];

  protected constructor(
    private readonly xmlDoc: XMLDocument,
    id: string,
  ) {
    super(xmlDoc.documentElement, id);
    this.binaryTypeElements = Array.from(this.rootElement.querySelectorAll('[type=binary]'));
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

export class EnektoContactFormData extends EnketoRootFormData {
  public static readonly SIBLING_FIELD_NAMES = ['parent', 'contact'] as const;
  private readonly childElements: Element[];
  private readonly rootContactElement: Element;

  constructor(xmlDoc: XMLDocument, id: string, type: string) {
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
    const rootDoc = new EnketoFormData(this.rootContactElement, this.id).deserializeDoc(formConfig);
    const liftIdValue = (idValue: unknown) => typeof idValue === 'string' ? { _id: idValue } : idValue;
    return {
      ...rootDoc,
      parent: liftIdValue(rootDoc.parent),
      contact: liftIdValue(rootDoc.contact)
    };
  }

  public getChildData() {
    return this.childElements.map(dbDoc => new EnketoFormData(dbDoc, this.getDocId(dbDoc)));
  }

  public getSiblingData(fieldName: typeof EnektoContactFormData.SIBLING_FIELD_NAMES[number]) {
    const element = this.findChildNode(this.rootElement, fieldName);
    return element ? new EnketoFormData(element, this.getDocId(element)) : null;
  }
}

export class EnketoReportFormData extends EnketoRootFormData {
  private readonly dbDocElements: Element[];
  public readonly hiddenElements: Element[];
  public readonly dbDocRefElements: Element[];

  constructor(xmlDoc: XMLDocument, id: string) {
    super(xmlDoc, id);
    this.dbDocElements = Array.from(this.rootElement.querySelectorAll('[db-doc=true i]'));
    this.hiddenElements = Array.from(this.rootElement.querySelectorAll('[tag=hidden i]'));
    this.dbDocRefElements = Array.from(this.rootElement.querySelectorAll('[db-doc-ref]'));
  }

  public getDbDocData() {
    return this.dbDocElements.map(dbDoc => new EnketoFormData(
      dbDoc,
      this.getDocId(dbDoc)
    ));
  }
}
