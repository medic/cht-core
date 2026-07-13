import { Injectable, NgZone } from '@angular/core';
import events from 'enketo-core/src/js/event';
import { DOC_TYPES } from '@medic/constants';
import { v7 as uuid } from 'uuid';
import { Xpath } from '@mm-providers/xpath-element-path.provider';
import * as FileManager from '../../js/enketo/file-manager';

@Injectable({
  providedIn: 'root'
})
export class NewEnketoService {
  constructor(
    private readonly ngZone: NgZone
  ) { }

  async saveReport(
    config: FormConfig,
    form: Record<string, any>,
    defaultData: Record<string, any> = {}
  ): Promise<Record<string, any>> {
    return this.ngZone.runOutsideAngular(async () => {
      await this.validate(form);
      const reportDoc: Record<string, any> = this.getReportDoc(config.doc.internalId, defaultData);
      const formDocData = this.getEnketoDoc(form, reportDoc._id);

      const subDocs = formDocData.getDbDocs();

      this.populateDbDocRefElements(formDocData, [formDocData, ...subDocs]);
      const binaryAttachments = this.populateBinaryAttachmentElements(formDocData, config.doc.internalId);
      const fileAttachments = FileManager
        .getCurrentFiles()
        .reduce((acc, file) => ({
          ...acc,
          [`user-file-${file.name}`]: { content_type: file.type, data: new Blob([ file ], { type: file.type }) }
        }), {});

      const rootOutputDoc = {
        ...reportDoc,
        form_version: config.doc.xmlVersion,
        hidden_fields: this.getHiddenFields([
          ...formDocData.hiddenElements,
          ...subDocs.map(({ rootElement }) => rootElement)
        ]),
        fields: formDocData.deserialize(config),
        _attachments: {
          ...reportDoc._attachments,
          ...fileAttachments,
          ...binaryAttachments
        }
      };

      const dbDocObjects = subDocs.map(docData => this.initializeDoc(docData.deserialize(config), docData.id));
      return [rootOutputDoc, ...dbDocObjects];
    });
  }

  private async validate(form: Record<string, any>) {
    const valid = await form.validate();
    if (!valid) {
      throw new Error('Form is invalid');
    }
    form.view.html.dispatchEvent(events.BeforeSave());
  }

  private getEnketoDoc(form: Record<string, any>, docId: string) {
    const formString = form.getDataStr({ irrelevant: false });
    const formDoc = new DOMParser().parseFromString(formString, 'text/xml');
    return new EnketoRootDoc(formDoc, docId);
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

  private initializeDoc(defaultData: Record<string, any>, _id = uuid()) {
    return {
      _id,
      reported_date: Date.now(),
      ...defaultData
    };
  }

  private getReportDoc(form: string, defaultData: Record<string, any>) {
    return {
      form,
      type: DOC_TYPES.DATA_RECORD,
      content_type: 'xml',
      from: defaultData.contact?.phone,
      ...this.initializeDoc(defaultData, defaultData._id),
      ...defaultData
    };
  }

  private populateDbDocRefElements(rootDoc: EnketoRootDoc, allDocs: EnketoDoc[]) {
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

  private populateBinaryAttachmentElements(rootDocData: EnketoRootDoc, form: string) {
    return rootDocData.binaryTypeElements
      .filter(({ textContent }) => textContent)
      .map(element => {
        const xpath = Xpath.getElementTreeXPath(element);
        const formXpath = xpath.replace(/^\/[^/]+/, `/${form}`);
        const filename = `user-file${formXpath}`;
        const data = element.textContent;
        element.textContent = '';
        return { filename, data };
      })
      .reduce((acc, { filename, data }) => ({
        ...acc,
        [filename]: { data, content_type: 'image/png' }
      }), {});
  }
}

// TODO Should return direct from xml-forms.service...
export class FormConfig {
  public readonly repeatPaths: string[];

  constructor(
    public readonly doc: Record<string, any>,
    xml: string,
  ){
    const xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    this.repeatPaths = Array
      .from(xmlDoc.querySelectorAll('repeat[nodeset]'))
      .map(el => el.getAttribute('nodeset')!)
      .filter(Boolean);
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
          (result[node.nodeName] ??= []).push(value);
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
}

// TODO Consider making this a ReportDoc and nesting all the dbDoc data stuff inside.
class EnketoRootDoc extends EnketoDoc {
  private readonly dbDocElements: Element[];
  public readonly hiddenElements: Element[];
  public readonly dbDocRefElements: Element[];
  public readonly binaryTypeElements: Element[];

  constructor(
    private readonly xmlDoc: XMLDocument,
    id: string,
  ) {
    super(xmlDoc.documentElement, id);
    this.dbDocElements = Array.from(this.rootElement.querySelectorAll('[db-doc=true i]'));
    this.hiddenElements = Array.from(this.rootElement.querySelectorAll('[tag=hidden i]'));
    this.dbDocRefElements = Array.from(this.rootElement.querySelectorAll('[db-doc-ref]'));
    this.binaryTypeElements = Array.from(this.rootElement.querySelectorAll('[type=binary i]'));
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

  private getDocId(element: Element) {
    return Array
      .from(element.children)
      .find(child => child.tagName === '_id')
      ?.textContent || uuid();
  }

  private getNodeWithLineage(contextNode?: Node | null, lineage: Node[] = []): Node[] {
    if (!this.isElementNode(contextNode)) {
      return lineage;
    }
    lineage.unshift(contextNode);
    return this.getNodeWithLineage(contextNode.parentNode, lineage);
  }
}


